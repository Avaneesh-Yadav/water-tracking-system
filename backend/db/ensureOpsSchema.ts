import pool from "./connection/connection";
import { DEFAULT_SLABS } from "../utils/tariff";

function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve) => {
    pool.query(sql, params, (err) => {
      if (err) {
        const code = (err as { code?: string }).code || "";
        const ignorable = [
          "ER_DUP_FIELDNAME",
          "ER_TABLE_EXISTS_ERROR",
          "ER_DUP_KEYNAME",
          "ER_DUP_ENTRY",
          "ER_CANT_DROP_FIELD_OR_KEY",
        ];
        if (!ignorable.includes(code) && !String(err.message || "").includes("Duplicate")) {
          console.warn("[ops-schema]", err.message);
        }
      }
      resolve();
    });
  });
}

export async function ensureOpsSchema(): Promise<void> {
  await run(
    `ALTER TABLE users MODIFY role ENUM('ADMIN','USER','SUPER_ADMIN','METER_READER') NOT NULL DEFAULT 'USER'`
  );
  await run(
    `ALTER TABLE users MODIFY status ENUM('ACTIVE','DELETED','REVOKE','DISCONNECTED','PENDING') NOT NULL DEFAULT 'ACTIVE'`
  );

  const userCols = [
    "ward VARCHAR(80) NULL",
    "parent_user_uuid VARCHAR(36) NULL",
    "meter_number VARCHAR(80) NULL",
    "meter_installed_at DATE NULL",
    "meter_status VARCHAR(24) NOT NULL DEFAULT 'OK'",
    "latitude DECIMAL(10,7) NULL",
    "longitude DECIMAL(10,7) NULL",
    "deposit_balance DECIMAL(12,2) NOT NULL DEFAULT 0",
    "totp_secret VARCHAR(64) NULL",
    "totp_enabled TINYINT(1) NOT NULL DEFAULT 0",
    "assigned_reader_uuid VARCHAR(36) NULL",
    "preferred_lang VARCHAR(8) NOT NULL DEFAULT 'en'",
  ];
  for (const col of userCols) {
    await run(`ALTER TABLE users ADD COLUMN ${col}`);
  }

  const consCols = [
    "bill_number VARCHAR(48) NULL",
    "paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0",
    "late_fee DECIMAL(12,2) NOT NULL DEFAULT 0",
    "reading_status VARCHAR(24) NOT NULL DEFAULT 'APPROVED'",
    "submitted_by VARCHAR(36) NULL",
    "credit_note TEXT NULL",
    "last_reminder_on DATE NULL",
  ];
  for (const col of consCols) {
    await run(`ALTER TABLE water_consumption ADD COLUMN ${col}`);
  }

  const payCols = [
    "status VARCHAR(24) NOT NULL DEFAULT 'APPROVED'",
    "utr VARCHAR(40) NULL",
    "rejection_reason TEXT NULL",
    "approved_by VARCHAR(36) NULL",
    "approved_at DATETIME NULL",
  ];
  for (const col of payCols) {
    await run(`ALTER TABLE payments ADD COLUMN ${col}`);
  }

  await run(`CREATE TABLE IF NOT EXISTS reading_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    ward VARCHAR(80) NULL,
    reader_uuid VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reader (reader_uuid)
  ) ENGINE=InnoDB`);

  await run(`CREATE TABLE IF NOT EXISTS reading_route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_uuid VARCHAR(36) NOT NULL,
    user_uuid VARCHAR(36) NOT NULL,
    stop_order INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_route_user (route_uuid, user_uuid),
    INDEX idx_route (route_uuid)
  ) ENGINE=InnoDB`);

  await run(`CREATE TABLE IF NOT EXISTS service_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_uuid VARCHAR(36) NOT NULL,
    category VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    details TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    photo_path VARCHAR(512) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket_user (user_uuid),
    INDEX idx_ticket_status (status)
  ) ENGINE=InnoDB`);

  await run(`CREATE TABLE IF NOT EXISTS connection_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    ward VARCHAR(80) NULL,
    notes TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    decided_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await run(`CREATE TABLE IF NOT EXISTS bill_sequences (
    period_key VARCHAR(12) NOT NULL PRIMARY KEY,
    last_n INT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB`);

  const defaults: Array<[string, string, string]> = [
    ["tariff_slabs", JSON.stringify(DEFAULT_SLABS), "JSON slabs: [{upto, rate}]"],
    ["late_fee_type", "amount", "amount or percent"],
    ["late_fee_value", "50", "Flat rupees or percent"],
    ["bill_prefix", "WB", "Bill number prefix"],
    ["reminder_days_before", "3", "Days before due to remind"],
    ["admin_2fa_required", "0", "Require TOTP for staff login"],
  ];
  for (const [k, v, d] of defaults) {
    await run(
      `INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_key = setting_key`,
      [k, v, d]
    );
  }

  console.log("Ops schema ready");
}
