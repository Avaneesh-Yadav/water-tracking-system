import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import { queryString } from "../utils/cast";
import pool from '../db/connection/connection';
import AuditLog from '../models/AuditLog';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthNum(m) {
  if (typeof m === 'number') return m;
  const s = String(m || '').slice(0, 3).toLowerCase();
  const i = MONTH_NAMES.findIndex((x) => x.toLowerCase().startsWith(s));
  return i >= 0 ? i + 1 : 1;
}

// GET /admin/reports/revenue
function getRevenueReportSimple(req, res) {
  pool.query(
    `SELECT wc.year, wc.month,
            COALESCE(SUM(wc.amount), 0) AS billed,
            COALESCE(SUM(CASE WHEN wc.payment_status = 'PAID' THEN wc.amount ELSE 0 END), 0) AS collected,
            COALESCE(SUM(CASE WHEN wc.payment_status = 'UNPAID' THEN wc.amount ELSE 0 END), 0) AS outstanding
     FROM water_consumption wc
     GROUP BY wc.year, wc.month
     ORDER BY wc.year DESC, FIELD(wc.month, 'December','November','October','September','August','July','June','May','April','March','February','January') DESC
     LIMIT 24`,
    (err, rows) => {
      if (err) {
        console.error('Revenue report error:', err);
        return res.status(500).json({ message: 'Failed to generate revenue report' });
      }
      const report = rows.map((r) => ({
        period: `${(r.month || '').toString().slice(0, 3)} ${r.year}`,
        year: r.year,
        month: r.month,
        billed: parseFloat(r.billed) || 0,
        collected: parseFloat(r.collected) || 0,
        outstanding: parseFloat(r.outstanding) || 0,
      }));
      res.json({ report });
    }
  );
}

export const getRevenueReport = getRevenueReportSimple;

// GET /admin/reports/consumption?from=&to=
export const getConsumptionReport = (req: AuthRequest, res: Response) => {
  pool.query(
    `SELECT wc.year, wc.month,
            COALESCE(SUM(wc.consumption_liters), 0) AS total_liters,
            COALESCE(SUM(wc.amount), 0) AS total_amount,
            COUNT(DISTINCT wc.user_uuid) AS connections
     FROM water_consumption wc
     GROUP BY wc.year, wc.month
     ORDER BY wc.year DESC, FIELD(wc.month, 'December','November','October','September','August','July','June','May','April','March','February','January') DESC
     LIMIT 24`,
    (err, rows) => {
      if (err) {
        console.error('Consumption report error:', err);
        return res.status(500).json({ message: 'Failed to generate consumption report' });
      }
      res.json({
        report: rows.map((r) => ({
          period: `${(r.month || '').toString().slice(0, 3)} ${r.year}`,
          year: r.year,
          month: r.month,
          total_liters: parseFloat(r.total_liters) || 0,
          total_amount: parseFloat(r.total_amount) || 0,
          connections: r.connections || 0,
        })),
      });
    }
  );
};

// GET /admin/reports/outstanding
export const getOutstandingReport = (req: AuthRequest, res: Response) => {
  pool.query(
    `SELECT u.uuid, u.full_name, u.mobile_number, u.connection_id, u.address,
            COALESCE(SUM(CASE WHEN wc.payment_status = 'UNPAID' THEN wc.amount ELSE 0 END), 0) AS due_amount,
            COUNT(CASE WHEN wc.payment_status = 'UNPAID' THEN 1 END) AS unpaid_count
     FROM users u
     LEFT JOIN water_consumption wc ON wc.user_uuid = u.uuid AND wc.payment_status = 'UNPAID'
     GROUP BY u.uuid
     HAVING due_amount > 0
     ORDER BY due_amount DESC`,
    (err, rows) => {
      if (err) {
        console.error('Outstanding report error:', err);
        return res.status(500).json({ message: 'Failed to generate outstanding report' });
      }
      res.json({
        report: rows.map((r) => ({
          user_uuid: r.uuid,
          full_name: r.full_name,
          mobile_number: r.mobile_number,
          connection_id: r.connection_id,
          address: r.address,
          due_amount: parseFloat(r.due_amount) || 0,
          unpaid_count: parseInt(r.unpaid_count, 10) || 0,
        })),
      });
    }
  );
};

// GET /admin/reports/audit?from=&to=&action=&user_uuid=&page=&limit=
export const getAuditLog = (req: AuthRequest, res: Response) => {
  const { from, to, action, user_uuid, page, limit } = req.query;
  AuditLog.getFiltered(
    {
      from: queryString(from) || undefined,
      to: queryString(to) || undefined,
      action: queryString(action) || undefined,
      user_uuid: queryString(user_uuid) || undefined,
      page: page ? parseInt(queryString(page), 10) : 1,
      limit: limit ? parseInt(queryString(limit), 10) : 50,
    },
    (err, result) => {
      if (err) {
        console.error('Audit log error:', err);
        return res.status(500).json({ message: 'Failed to fetch audit log' });
      }
      res.json(result);
    }
  );
};
