import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { dbq, settingGet, settingSet } from "../utils/dbq";
import pool from "../db/connection/connection";
import { amountFromSlabs, lateFeeFor, parseSlabs } from "../utils/tariff";
import { nextBillNumber } from "../utils/billNumber";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "../utils/totp";
import { isMeterReader, isStaffRole } from "../utils/roles";
import Notification from "../models/Notification";
import smsService from "../smsService";
import Settings from "../models/Settings";
import User from "../models/User";

async function inbox(userId: string, text: string, relatedTo: string) {
  await new Promise<void>((resolve, reject) => {
    Notification.create(uuidv4(), userId, text, relatedTo, (err) => (err ? reject(err) : resolve()));
  });
}

async function fallbackRate(): Promise<number> {
  return new Promise((resolve) => {
    Settings.getRatePerLiter((_e, rate) => resolve(Number(rate) || 20));
  });
}

async function tariffAmount(liters: number) {
  const slabs = parseSlabs(await settingGet("tariff_slabs"));
  const rate = await fallbackRate();
  return amountFromSlabs(liters, slabs, rate);
}

function readerFilter(req: AuthRequest): string {
  if (isMeterReader(req.user?.role) && !isStaffRole(req.user?.role)) {
    return String(req.user.uuid);
  }
  return "";
}

export async function getOpsSettings(_req: AuthRequest, res: Response) {
  try {
    const keys = [
      "tariff_slabs",
      "late_fee_type",
      "late_fee_value",
      "bill_prefix",
      "reminder_days_before",
      "admin_2fa_required",
    ];
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = (await settingGet(k)) || "";
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to load settings" });
  }
}

export async function updateOpsSettings(req: AuthRequest, res: Response) {
  try {
    const body = req.body || {};
    const allowed = [
      "tariff_slabs",
      "late_fee_type",
      "late_fee_value",
      "bill_prefix",
      "reminder_days_before",
      "admin_2fa_required",
    ];
    for (const k of allowed) {
      if (body[k] != null) await settingSet(k, typeof body[k] === "string" ? body[k] : JSON.stringify(body[k]));
    }
    res.json({ message: "Settings saved" });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to save settings" });
  }
}

export async function runBillCycle(req: AuthRequest, res: Response) {
  try {
    const month = String(req.body.month || "");
    const year = parseInt(req.body.year, 10);
    if (!month || !year) return res.status(400).json({ message: "month and year are required" });

    const rows = await dbq<any[]>(
      `SELECT wc.uuid, wc.user_uuid, wc.consumption_liters, wc.amount, wc.bill_number, u.mobile_number, u.full_name
       FROM water_consumption wc
       JOIN users u ON u.uuid = wc.user_uuid
       WHERE wc.month = ? AND wc.year = ? AND wc.reading_status = 'APPROVED'`,
      [month, year]
    );
    let numbered = 0;
    let sms = 0;
    for (const row of rows) {
      // Only newly numbered bills get an SMS/inbox notice, so re-running the cycle
      // for the same month does not re-spam every consumer.
      if (row.bill_number) continue;
      const num = await nextBillNumber();
      await dbq("UPDATE water_consumption SET bill_number = ? WHERE uuid = ?", [num, row.uuid]);
      numbered += 1;
      try {
        await smsService.sendBillGenerated(row.mobile_number, row.full_name, month, year, row.amount);
        sms += 1;
      } catch {
        /* SMS optional */
      }
      await inbox(
        row.user_uuid,
        JSON.stringify({
          title: `Bill for ${month} ${year}`,
          body: `Your water bill is ready. Amount ₹${Number(row.amount).toFixed(2)}.`,
        }),
        "BILL"
      );
    }
    res.json({ message: "Bill run complete", billed: rows.length, numbered, sms });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Bill run failed" });
  }
}

export async function applyLateFees(_req: AuthRequest, res: Response) {
  try {
    const dueDay = await new Promise<number>((resolve) => {
      Settings.getBillDueDay((_e, d) => resolve(Number(d) || 10));
    });
    const today = new Date();
    const type = (await settingGet("late_fee_type")) || "amount";
    const value = Number((await settingGet("late_fee_value")) || 50);
    const unpaid = await dbq<any[]>(
      `SELECT uuid, year, month, amount, late_fee FROM water_consumption WHERE payment_status = 'UNPAID' AND reading_status = 'APPROVED'`
    );
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];
    let updated = 0;
    for (const bill of unpaid) {
      const mi = months.indexOf(bill.month);
      if (mi < 0) continue;
      const due = new Date(Number(bill.year), mi, dueDay, 23, 59, 59);
      if (today <= due) continue;
      if (Number(bill.late_fee) > 0) continue;
      const fee = lateFeeFor(bill.amount, type, value);
      await dbq("UPDATE water_consumption SET late_fee = ?, amount = amount + ? WHERE uuid = ?", [
        fee,
        fee,
        bill.uuid,
      ]);
      updated += 1;
    }
    res.json({ message: "Late fees applied", updated });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to apply late fees" });
  }
}

export async function creditNote(req: AuthRequest, res: Response) {
  try {
    const { consumption_uuid, amount, note } = req.body;
    const credit = Math.max(0, parseFloat(amount) || 0);
    if (!consumption_uuid || credit <= 0) {
      return res.status(400).json({ message: "consumption_uuid and amount are required" });
    }
    const rows = await dbq<any[]>("SELECT * FROM water_consumption WHERE uuid = ?", [consumption_uuid]);
    if (!rows[0]) return res.status(404).json({ message: "Bill not found" });
    const bill = rows[0];
    const nextAmount = Math.max(0, Number(bill.amount) - credit);
    const paid = Number(bill.paid_amount) || 0;
    const status = paid >= nextAmount ? "PAID" : "UNPAID";
    await dbq(
      `UPDATE water_consumption SET amount = ?, payment_status = ?, credit_note = CONCAT(IFNULL(credit_note,''), ?) WHERE uuid = ?`,
      [nextAmount, status, `\n${new Date().toISOString().slice(0, 10)}: −₹${credit} ${note || ""}`, consumption_uuid]
    );
    res.json({ message: "Credit note applied", amount: nextAmount, payment_status: status });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Credit note failed" });
  }
}

export async function adjustDeposit(req: AuthRequest, res: Response) {
  try {
    const { user_uuid, amount, note } = req.body;
    const delta = parseFloat(amount);
    if (!user_uuid || Number.isNaN(delta)) return res.status(400).json({ message: "user_uuid and amount required" });
    await dbq("UPDATE users SET deposit_balance = GREATEST(0, deposit_balance + ?) WHERE uuid = ?", [delta, user_uuid]);
    const rows = await dbq<any[]>("SELECT deposit_balance FROM users WHERE uuid = ?", [user_uuid]);
    await inbox(
      user_uuid,
      JSON.stringify({ title: "Security deposit", body: `${delta >= 0 ? "Added" : "Adjusted"} ₹${Math.abs(delta)}. ${note || ""}` }),
      "DEPOSIT"
    );
    res.json({ message: "Deposit updated", deposit_balance: Number(rows[0]?.deposit_balance) || 0 });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Deposit update failed" });
  }
}

export async function payFromDeposit(req: AuthRequest, res: Response) {
  const { consumption_uuid } = req.body;
  if (!consumption_uuid) return res.status(400).json({ message: "consumption_uuid required" });
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    // Lock the user row so two concurrent requests cannot both spend the same balance.
    const [rows] = await conn.query<any[]>(
      `SELECT wc.*, u.deposit_balance FROM water_consumption wc
       JOIN users u ON u.uuid = wc.user_uuid WHERE wc.uuid = ? FOR UPDATE`,
      [consumption_uuid]
    );
    const bill = rows[0];
    if (!bill) {
      await conn.rollback();
      return res.status(404).json({ message: "Bill not found" });
    }
    const due = Math.max(0, Number(bill.amount) - Number(bill.paid_amount || 0));
    const take = Math.min(due, Number(bill.deposit_balance) || 0);
    if (take <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Nothing to apply from deposit" });
    }
    const paid = Number(bill.paid_amount || 0) + take;
    const status = paid >= Number(bill.amount) ? "PAID" : "UNPAID";
    await conn.query("UPDATE water_consumption SET paid_amount = ?, payment_status = ? WHERE uuid = ?", [
      paid,
      status,
      consumption_uuid,
    ]);
    await conn.query("UPDATE users SET deposit_balance = deposit_balance - ? WHERE uuid = ?", [take, bill.user_uuid]);
    await conn.commit();
    res.json({ message: "Deposit applied", applied: take, payment_status: status });
  } catch (e: any) {
    await conn.rollback().catch(() => {});
    res.status(500).json({ message: e.message || "Failed to apply deposit" });
  } finally {
    conn.release();
  }
}

export async function printPack(req: AuthRequest, res: Response) {
  try {
    const ward = String(req.query.ward || "").trim();
    const sql = `SELECT wc.*, u.full_name, u.connection_id, u.address, u.mobile_number, u.ward
      FROM water_consumption wc
      JOIN users u ON u.uuid = wc.user_uuid
      WHERE wc.payment_status = 'UNPAID' AND wc.reading_status = 'APPROVED'
      ${ward ? "AND u.ward = ?" : ""}
      ORDER BY u.ward, u.full_name`;
    const bills = await dbq<any[]>(sql, ward ? [ward] : []);
    res.json({ bills, ward: ward || null });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Print pack failed" });
  }
}

export async function leakAlerts(req: AuthRequest, res: Response) {
  try {
    const scope = readerFilter(req);
    const rows = await dbq<any[]>(
      `SELECT u.uuid AS user_uuid, u.full_name, u.connection_id, u.ward,
              latest.month, latest.year, latest.consumption_liters,
              avgx.avg_prev
       FROM users u
       JOIN (
         SELECT wc.user_uuid, wc.month, wc.year, wc.consumption_liters
         FROM water_consumption wc
         INNER JOIN (
           SELECT user_uuid, MAX(CONCAT(year, LPAD(id,10,'0'))) AS mk
           FROM water_consumption WHERE reading_status = 'APPROVED'
           GROUP BY user_uuid
         ) t ON t.user_uuid = wc.user_uuid AND CONCAT(wc.year, LPAD(wc.id,10,'0')) = t.mk
       ) latest ON latest.user_uuid = u.uuid
       JOIN (
         SELECT user_uuid, AVG(consumption_liters) AS avg_prev
         FROM water_consumption WHERE reading_status = 'APPROVED'
         GROUP BY user_uuid
       ) avgx ON avgx.user_uuid = u.uuid
       WHERE UPPER(u.role) = 'USER'
       ${scope ? "AND u.assigned_reader_uuid = ?" : ""}
       AND latest.consumption_liters > avgx.avg_prev * 1.8
       ORDER BY latest.consumption_liters DESC
       LIMIT 200`,
      scope ? [scope] : []
    );
    res.json({ alerts: rows || [] });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Leak alerts failed" });
  }
}

export async function submitReading(req: AuthRequest, res: Response) {
  try {
    const { user_uuid, month, year, previous_meter_reading, current_meter_reading, notes } = req.body;
    if (!user_uuid || !month || !year) return res.status(400).json({ message: "user_uuid, month, year required" });
    const scope = readerFilter(req);
    if (scope) {
      const ok = await dbq<any[]>("SELECT uuid FROM users WHERE uuid = ? AND assigned_reader_uuid = ?", [
        user_uuid,
        scope,
      ]);
      if (!ok[0]) return res.status(403).json({ message: "Not assigned to this connection" });
    }
    const exists = await dbq<any[]>(
      "SELECT uuid FROM water_consumption WHERE user_uuid = ? AND month = ? AND year = ?",
      [user_uuid, month, year]
    );
    if (exists[0]) return res.status(409).json({ message: "A reading already exists for this period" });
    // Fall back to the last completed reading so a blank field never bills the full meter dial.
    let prev: number;
    if (previous_meter_reading != null && String(previous_meter_reading).trim() !== "") {
      prev = parseFloat(previous_meter_reading);
    } else {
      const last = await dbq<any[]>(
        `SELECT current_meter_reading FROM water_consumption
         WHERE user_uuid = ? AND current_meter_reading IS NOT NULL
         ORDER BY year DESC, created_at DESC LIMIT 1`,
        [user_uuid]
      );
      prev = Number(last[0]?.current_meter_reading) || 0;
    }
    const curr = parseFloat(current_meter_reading);
    if (Number.isNaN(curr) || curr < prev) {
      return res.status(400).json({ message: "Current reading must be >= previous" });
    }
    const liters = curr - prev;
    const priced = await tariffAmount(liters);
    const uuid = uuidv4();
    const now = new Date();
    const staff = isStaffRole(req.user?.role);
    const readingStatus = staff ? "APPROVED" : "PENDING_REVIEW";
    const billNo = staff ? await nextBillNumber() : null;
    await dbq(
      `INSERT INTO water_consumption
       (uuid, user_uuid, month, year, consumption_liters, previous_meter_reading, current_meter_reading,
        rate_per_liter, amount, payment_status, reading_status, submitted_by, bill_number, paid_amount, late_fee, credit_note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,'UNPAID',?,?,?,0,0,?,?,?)`,
      [
        uuid,
        user_uuid,
        month,
        parseInt(year, 10),
        liters,
        prev,
        curr,
        priced.effectiveRate,
        priced.amount,
        readingStatus,
        req.user.uuid,
        billNo,
        notes || null,
        now,
        now,
      ]
    );
    res.status(201).json({
      message: staff ? "Reading billed" : "Reading submitted for approval",
      uuid,
      liters,
      amount: priced.amount,
      reading_status: readingStatus,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to submit reading" });
  }
}

export async function pendingReadings(req: AuthRequest, res: Response) {
  try {
    const rows = await dbq<any[]>(
      `SELECT wc.*, u.full_name, u.connection_id, u.ward
       FROM water_consumption wc JOIN users u ON u.uuid = wc.user_uuid
       WHERE wc.reading_status = 'PENDING_REVIEW'
       ORDER BY wc.created_at DESC`
    );
    res.json({ readings: rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to list readings" });
  }
}

export async function decideReading(req: AuthRequest, res: Response) {
  try {
    const { uuid } = req.params;
    const approve = req.body.approve !== false;
    const rows = await dbq<any[]>("SELECT * FROM water_consumption WHERE uuid = ?", [uuid]);
    if (!rows[0]) return res.status(404).json({ message: "Reading not found" });
    if (approve) {
      // Only a reading still awaiting review can be approved. Without this guard a
      // double-click re-approves an already-billed row and texts the consumer twice.
      if (String(rows[0].reading_status).toUpperCase() !== "PENDING_REVIEW") {
        return res.status(409).json({ message: "This reading has already been decided" });
      }
      const num = rows[0].bill_number || (await nextBillNumber());
      const result = await dbq<any>(
        "UPDATE water_consumption SET reading_status = 'APPROVED', bill_number = ? WHERE uuid = ? AND reading_status = 'PENDING_REVIEW'",
        [num, uuid]
      );
      if (!result?.affectedRows) {
        return res.status(409).json({ message: "This reading has already been decided" });
      }
      const user = await dbq<any[]>("SELECT mobile_number, full_name FROM users WHERE uuid = ?", [rows[0].user_uuid]);
      try {
        await smsService.sendBillGenerated(
          user[0]?.mobile_number,
          user[0]?.full_name,
          rows[0].month,
          rows[0].year,
          rows[0].amount
        );
      } catch {
        /* optional */
      }
      await inbox(
        rows[0].user_uuid,
        JSON.stringify({ title: "Bill ready", body: `Bill ${num} for ${rows[0].month} ${rows[0].year}` }),
        "BILL"
      );
      return res.json({ message: "Reading approved", bill_number: num });
    }
    await dbq("DELETE FROM water_consumption WHERE uuid = ? AND reading_status = 'PENDING_REVIEW'", [uuid]);
    res.json({ message: "Reading rejected and removed" });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to decide reading" });
  }
}

export async function listRoutes(_req: AuthRequest, res: Response) {
  const routes = await dbq<any[]>(
    `SELECT r.*, u.full_name AS reader_name,
      (SELECT COUNT(*) FROM reading_route_stops s WHERE s.route_uuid = r.uuid) AS stop_count
     FROM reading_routes r LEFT JOIN users u ON u.uuid = r.reader_uuid ORDER BY r.name`
  );
  res.json({ routes });
}

export async function saveRoute(req: AuthRequest, res: Response) {
  const { uuid, name, ward, reader_uuid, user_uuids } = req.body;
  if (!name) return res.status(400).json({ message: "name required" });
  const id = uuid || uuidv4();
  const existing = await dbq<any[]>("SELECT uuid FROM reading_routes WHERE uuid = ?", [id]);
  if (existing[0]) {
    await dbq("UPDATE reading_routes SET name = ?, ward = ?, reader_uuid = ? WHERE uuid = ?", [
      name,
      ward || null,
      reader_uuid || null,
      id,
    ]);
    await dbq("DELETE FROM reading_route_stops WHERE route_uuid = ?", [id]);
  } else {
    await dbq("INSERT INTO reading_routes (uuid, name, ward, reader_uuid) VALUES (?,?,?,?)", [
      id,
      name,
      ward || null,
      reader_uuid || null,
    ]);
  }
  const stops: string[] = Array.isArray(user_uuids) ? user_uuids : [];
  for (let i = 0; i < stops.length; i++) {
    await dbq("INSERT INTO reading_route_stops (route_uuid, user_uuid, stop_order) VALUES (?,?,?)", [
      id,
      stops[i],
      i + 1,
    ]);
  }
  // Drop reader assignment from consumers that were removed from this route,
  // otherwise they stay in the reader's scoped queries forever.
  const placeholders = stops.map(() => "?").join(",");
  if (stops.length) {
    await dbq(
      `UPDATE users SET assigned_reader_uuid = NULL WHERE assigned_reader_uuid IS NOT NULL AND uuid NOT IN (${placeholders})`,
      stops
    );
  } else {
    await dbq("UPDATE users SET assigned_reader_uuid = NULL WHERE assigned_reader_uuid IS NOT NULL");
  }
  if (reader_uuid) {
    for (const uid of stops) {
      await dbq("UPDATE users SET assigned_reader_uuid = ? WHERE uuid = ?", [reader_uuid, uid]);
    }
  }
  res.json({ message: "Route saved", uuid: id });
}

export async function myRoute(req: AuthRequest, res: Response) {
  const reader = isStaffRole(req.user?.role) ? String(req.query.reader_uuid || req.user.uuid) : req.user.uuid;
  const routes = await dbq<any[]>("SELECT * FROM reading_routes WHERE reader_uuid = ?", [reader]);
  const route = routes[0];
  if (!route) return res.json({ route: null, stops: [] });
  const stops = await dbq<any[]>(
    `SELECT s.stop_order, u.uuid, u.full_name, u.connection_id, u.address, u.ward, u.meter_number,
            u.latitude, u.longitude,
            (SELECT current_meter_reading FROM water_consumption c WHERE c.user_uuid = u.uuid
             ORDER BY c.year DESC, c.created_at DESC LIMIT 1) AS last_reading
     FROM reading_route_stops s JOIN users u ON u.uuid = s.user_uuid
     WHERE s.route_uuid = ? ORDER BY s.stop_order`,
    [route.uuid]
  );
  res.json({ route, stops });
}

export async function meterMaster(req: AuthRequest, res: Response) {
  const scope = readerFilter(req);
  const rows = await dbq<any[]>(
    `SELECT uuid, full_name, connection_id, ward, meter_number, meter_installed_at, meter_status,
            latitude, longitude, assigned_reader_uuid, deposit_balance, status
     FROM users WHERE UPPER(role) = 'USER' ${scope ? "AND assigned_reader_uuid = ?" : ""}
     ORDER BY ward, full_name`,
    scope ? [scope] : []
  );
  res.json({ meters: rows });
}

export async function updateMeter(req: AuthRequest, res: Response) {
  const { uuid } = req.params;
  const body = req.body || {};
  // Only touch columns the client actually sent, so an explicit null clears the
  // field instead of COALESCE silently keeping the old value.
  const columns = [
    "meter_number",
    "meter_installed_at",
    "meter_status",
    "latitude",
    "longitude",
    "ward",
    "assigned_reader_uuid",
  ] as const;
  const sets: string[] = [];
  const params: any[] = [];
  for (const col of columns) {
    if (!Object.prototype.hasOwnProperty.call(body, col)) continue;
    const value = body[col];
    sets.push(`${col} = ?`);
    params.push(value === "" ? null : value);
  }
  if (!sets.length) return res.status(400).json({ message: "Nothing to update" });
  params.push(uuid);
  await dbq(`UPDATE users SET ${sets.join(", ")} WHERE uuid = ?`, params);
  res.json({ message: "Meter updated" });
}

export async function listTickets(req: AuthRequest, res: Response) {
  const staff = isStaffRole(req.user?.role);
  const rows = staff
    ? await dbq<any[]>(
        `SELECT t.*, u.full_name, u.connection_id, u.mobile_number FROM service_tickets t
         JOIN users u ON u.uuid = t.user_uuid ORDER BY t.created_at DESC`
      )
    : await dbq<any[]>("SELECT * FROM service_tickets WHERE user_uuid = ? ORDER BY created_at DESC", [
        req.user.uuid,
      ]);
  res.json({ tickets: rows });
}

export async function createTicket(req: AuthRequest, res: Response) {
  const { category, title, details } = req.body;
  if (!title) return res.status(400).json({ message: "title required" });
  const uuid = uuidv4();
  const cat = category || "GENERAL";
  const detailText = details ? String(details) : "";
  await dbq(
    `INSERT INTO service_tickets (uuid, user_uuid, category, title, details, status) VALUES (?,?,?,?,?,'OPEN')`,
    [uuid, req.user.uuid, cat, title, detailText || null]
  );
  res.status(201).json({ message: "Ticket opened", uuid });
}

export async function updateTicket(req: AuthRequest, res: Response) {
  const { uuid } = req.params;
  const { status } = req.body;
  const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
  await dbq("UPDATE service_tickets SET status = ? WHERE uuid = ?", [status, uuid]);
  res.json({ message: "Ticket updated" });
}

export async function setConnectionStatus(req: AuthRequest, res: Response) {
  const { user_uuid, status } = req.body;
  if (!["ACTIVE", "DISCONNECTED", "REVOKE"].includes(status)) {
    return res.status(400).json({ message: "status must be ACTIVE, DISCONNECTED, or REVOKE" });
  }
  await dbq("UPDATE users SET status = ? WHERE uuid = ?", [status, user_uuid]);
  await inbox(
    user_uuid,
    JSON.stringify({
      title: status === "ACTIVE" ? "Connection restored" : "Connection update",
      body: `Your connection is now ${status}.`,
    }),
    "CONNECTION"
  );
  res.json({ message: "Status updated", status });
}

export async function listApplications(_req: AuthRequest, res: Response) {
  const rows = await dbq<any[]>("SELECT * FROM connection_applications ORDER BY created_at DESC");
  res.json({ applications: rows });
}

export async function createApplication(req: AuthRequest, res: Response) {
  const { full_name, mobile_number, address, ward, notes } = req.body;
  if (!full_name || !mobile_number || !address) {
    return res.status(400).json({ message: "Name, mobile, and address are required" });
  }
  const uuid = uuidv4();
  await dbq(
    `INSERT INTO connection_applications (uuid, full_name, mobile_number, address, ward, notes, status)
     VALUES (?,?,?,?,?,?,'PENDING')`,
    [uuid, full_name, mobile_number, address, ward || null, notes || null]
  );
  res.status(201).json({ message: "Application submitted", uuid });
}

export async function decideApplication(req: AuthRequest, res: Response) {
  const { uuid } = req.params;
  const approve = req.body.approve !== false;
  const rows = await dbq<any[]>("SELECT * FROM connection_applications WHERE uuid = ?", [uuid]);
  if (!rows[0]) return res.status(404).json({ message: "Application not found" });
  const status = approve ? "APPROVED" : "REJECTED";
  await dbq("UPDATE connection_applications SET status = ?, decided_by = ? WHERE uuid = ?", [
    status,
    req.user.uuid,
    uuid,
  ]);
  res.json({
    message: approve ? "Approved — create the consumer from Register if they do not exist yet" : "Rejected",
    status,
    application: rows[0],
  });
}

export async function extraConnection(req: AuthRequest, res: Response) {
  const { parent_user_uuid, address, ward } = req.body;
  if (!parent_user_uuid) return res.status(400).json({ message: "parent_user_uuid required" });
  const parent = await dbq<any[]>("SELECT * FROM users WHERE uuid = ?", [parent_user_uuid]);
  if (!parent[0]) return res.status(404).json({ message: "Parent consumer not found" });
  const siteMobile = String(req.body.mobile_number || "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(siteMobile) || siteMobile === parent[0].mobile_number) {
    return res.status(400).json({
      message: "Provide a distinct 10-digit contact number for this extra connection",
    });
  }
  const taken = await dbq<any[]>("SELECT uuid FROM users WHERE mobile_number = ? LIMIT 1", [siteMobile]);
  if (taken[0]) {
    return res.status(409).json({ message: "That mobile number already belongs to another account" });
  }
  // Never share the parent's credentials: issue a random temporary password and
  // let the consumer reset it through the normal flow.
  const tempPassword = crypto.randomBytes(18).toString("base64url");
  const hash = await bcrypt.hash(tempPassword, 10);
  const uuid = uuidv4();
  await new Promise<void>((resolve, reject) => {
    User.create(
      uuid,
      `${parent[0].full_name} (${address || "site"})`.slice(0, 255),
      siteMobile,
      hash,
      "USER",
      address || parent[0].address,
      "ACTIVE",
      (err) => (err ? reject(err) : resolve())
    );
  });
  await dbq("UPDATE users SET parent_user_uuid = ?, ward = ? WHERE uuid = ?", [
    parent_user_uuid,
    ward || parent[0].ward || null,
    uuid,
  ]);
  res.status(201).json({ message: "Extra connection created", uuid, temporary_password: tempPassword });
}

export async function myConnections(req: AuthRequest, res: Response) {
  const uid = req.user.uuid;
  const rows = await dbq<any[]>(
    `SELECT uuid, full_name, connection_id, address, ward, meter_number, status, deposit_balance, parent_user_uuid
     FROM users WHERE uuid = ? OR parent_user_uuid = ? OR uuid = (SELECT parent_user_uuid FROM users WHERE uuid = ?)
     ORDER BY created_at`,
    [uid, uid, uid]
  );
  res.json({ connections: rows });
}

export async function mapPoints(req: AuthRequest, res: Response) {
  const scope = readerFilter(req);
  const rows = await dbq<any[]>(
    `SELECT uuid, full_name, connection_id, ward, latitude, longitude, status, meter_status
     FROM users WHERE UPPER(role)='USER' AND latitude IS NOT NULL AND longitude IS NOT NULL
     ${scope ? "AND assigned_reader_uuid = ?" : ""}`,
    scope ? [scope] : []
  );
  res.json({ points: rows });
}

export async function boardPack(_req: AuthRequest, res: Response) {
  const outstanding = await dbq<any[]>(
    `SELECT u.connection_id, u.full_name, u.mobile_number, u.ward,
            SUM(CASE WHEN wc.payment_status='UNPAID' THEN wc.amount - IFNULL(wc.paid_amount,0) ELSE 0 END) AS due_amount,
            SUM(CASE WHEN wc.payment_status='UNPAID' THEN 1 ELSE 0 END) AS unpaid_count
     FROM users u LEFT JOIN water_consumption wc ON wc.user_uuid = u.uuid
     WHERE UPPER(u.role)='USER'
     GROUP BY u.uuid HAVING due_amount > 0
     ORDER BY due_amount DESC`
  );
  const revenue = await dbq<any[]>(
    `SELECT year, month, SUM(amount) billed,
            SUM(CASE WHEN payment_status='PAID' THEN amount ELSE 0 END) collected
     FROM water_consumption GROUP BY year, month ORDER BY year DESC`
  );
  const audit = await dbq<any[]>("SELECT created_at, user_role, action, entity_type, entity_id FROM audit_log ORDER BY created_at DESC LIMIT 500");
  res.json({ outstanding, revenue, audit, generated_at: new Date().toISOString() });
}

export async function sendReminders(_req: AuthRequest, res: Response) {
  const result = await runDueReminders();
  res.json(result);
}

export async function runDueReminders() {
  const dueDay = await new Promise<number>((resolve) => {
    Settings.getBillDueDay((_e, d) => resolve(Number(d) || 10));
  });
  const daysBefore = Number((await settingGet("reminder_days_before")) || 3);
  const today = new Date();
  const unpaid = await dbq<any[]>(
    `SELECT wc.uuid, wc.month, wc.year, wc.amount, wc.last_reminder_on,
            u.uuid AS user_uuid, u.mobile_number, u.full_name
     FROM water_consumption wc JOIN users u ON u.uuid = wc.user_uuid
     WHERE wc.payment_status='UNPAID' AND wc.reading_status='APPROVED'`
  );
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const months = [
    "January","February","March","April","May","June","July","August","September","October","November","December",
  ];
  let sent = 0;
  for (const bill of unpaid) {
    // The job runs several times a day; only remind each bill once per calendar day.
    if (bill.last_reminder_on && String(bill.last_reminder_on).slice(0, 10) === todayKey) continue;
    const mi = months.indexOf(bill.month);
    if (mi < 0) continue;
    const due = new Date(Number(bill.year), mi, dueDay);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff === daysBefore || diff === 0 || diff === -3) {
      try {
        await smsService.sendDueReminder(bill.mobile_number, bill.full_name, bill.amount, dueDay);
        sent += 1;
      } catch {
        /* optional */
      }
      await inbox(
        bill.user_uuid,
        JSON.stringify({
          title: diff < 0 ? "Bill overdue" : "Bill due reminder",
          body: `₹${Number(bill.amount).toFixed(2)} for ${bill.month} ${bill.year}. Due on the ${dueDay}th.`,
        }),
        "REMINDER"
      );
      await dbq("UPDATE water_consumption SET last_reminder_on = CURDATE() WHERE uuid = ?", [bill.uuid]);
    }
  }
  return { message: "Reminders processed", sent };
}

export async function beginTotp(req: AuthRequest, res: Response) {
  const secret = generateTotpSecret();
  await dbq("UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE uuid = ?", [secret, req.user.uuid]);
  const account = String(req.user.name || req.user.uuid);
  res.json({ secret, otpauth_url: otpauthUrl(secret, account) });
}

export async function confirmTotp(req: AuthRequest, res: Response) {
  const rows = await dbq<any[]>("SELECT totp_secret FROM users WHERE uuid = ?", [req.user.uuid]);
  const secret = rows[0]?.totp_secret;
  if (!secret || !verifyTotp(secret, String(req.body.code || ""))) {
    return res.status(400).json({ message: "Invalid authenticator code" });
  }
  await dbq("UPDATE users SET totp_enabled = 1 WHERE uuid = ?", [req.user.uuid]);
  res.json({ message: "Two-factor authentication enabled" });
}

export async function disableTotp(req: AuthRequest, res: Response) {
  const rows = await dbq<any[]>("SELECT totp_secret, totp_enabled FROM users WHERE uuid = ?", [req.user.uuid]);
  if (rows[0]?.totp_enabled && !verifyTotp(rows[0].totp_secret, String(req.body.code || ""))) {
    return res.status(400).json({ message: "Invalid authenticator code" });
  }
  await dbq("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE uuid = ?", [req.user.uuid]);
  res.json({ message: "Two-factor authentication disabled" });
}

export async function markMyNotificationRead(req: AuthRequest, res: Response) {
  await dbq("UPDATE notifications SET is_read = 1 WHERE uuid = ? AND user_id = ?", [
    req.params.uuid,
    req.user.uuid,
  ]);
  res.json({ message: "Read" });
}

export async function markAllMyNotificationsRead(req: AuthRequest, res: Response) {
  await dbq("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.uuid]);
  res.json({ message: "All read" });
}
