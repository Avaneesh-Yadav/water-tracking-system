const pool = require('../db/connection/connection');

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// GET /admin/backup/export — JSON download
exports.exportData = async (req, res) => {
  try {
    const [users, water_consumption, payments, app_settings, audit_log] = await Promise.all([
      queryAsync('SELECT * FROM users'),
      queryAsync('SELECT * FROM water_consumption'),
      queryAsync('SELECT * FROM payments'),
      queryAsync('SELECT * FROM app_settings'),
      queryAsync('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5000').catch(() => []),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      version: 1,
      users,
      water_consumption,
      payments,
      app_settings,
      audit_log: audit_log || [],
    };

    const body = JSON.stringify(payload, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aquaflow-backup-${Date.now()}.json"`);
    res.send(body);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ message: 'Failed to export backup', error: err.message });
  }
};

// POST /admin/backup/restore — body = full export JSON (same shape as export)
exports.restoreData = async (req, res) => {
  const body = req.body || {};
  const users = body.users || [];
  const water_consumption = body.water_consumption || [];
  const payments = body.payments || [];
  const app_settings = body.app_settings || [];

  const results = { users: 0, water_consumption: 0, payments: 0, app_settings: 0, errors: [] };

  const runInTransaction = (fn) =>
    new Promise((resolve, reject) => {
      pool.getConnection((connErr, connection) => {
        if (connErr) return reject(connErr);
        connection.beginTransaction((txErr) => {
          if (txErr) {
            connection.release();
            return reject(txErr);
          }
          fn(connection)
            .then(() => {
              connection.commit((cErr) => {
                connection.release();
                if (cErr) return reject(cErr);
                resolve();
              });
            })
            .catch((e) => {
              connection.rollback(() => {
                connection.release();
                reject(e);
              });
            });
        });
      });
    });

  const q = (connection, sql, params) =>
    new Promise((resolve, reject) => {
      connection.query(sql, params, (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });

  try {
    await runInTransaction(async (connection) => {
      for (const u of users) {
        if (!u.uuid) continue;
        await q(
          connection,
          `INSERT INTO users (uuid, full_name, mobile_number, password, role, address, status, connection_id, refresh_token, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
           ON DUPLICATE KEY UPDATE
             full_name = VALUES(full_name),
             mobile_number = VALUES(mobile_number),
             password = VALUES(password),
             role = VALUES(role),
             address = VALUES(address),
             status = VALUES(status),
             connection_id = VALUES(connection_id),
             refresh_token = VALUES(refresh_token),
             updated_at = VALUES(updated_at)`,
          [
            u.uuid,
            u.full_name,
            u.mobile_number,
            u.password,
            u.role || 'USER',
            u.address,
            u.status || 'ACTIVE',
            u.connection_id,
            u.refresh_token || null,
            u.created_at,
            u.updated_at,
          ]
        );
        results.users += 1;
      }

      for (const wc of water_consumption) {
        if (!wc.uuid) continue;
        await q(
          connection,
          `INSERT INTO water_consumption (uuid, user_uuid, month, year, consumption_liters, rate_per_liter, amount, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
           ON DUPLICATE KEY UPDATE
             user_uuid = VALUES(user_uuid),
             month = VALUES(month),
             year = VALUES(year),
             consumption_liters = VALUES(consumption_liters),
             rate_per_liter = VALUES(rate_per_liter),
             amount = VALUES(amount),
             payment_status = VALUES(payment_status),
             updated_at = VALUES(updated_at)`,
          [
            wc.uuid,
            wc.user_uuid,
            wc.month,
            wc.year,
            wc.consumption_liters,
            wc.rate_per_liter,
            wc.amount,
            wc.payment_status || 'UNPAID',
            wc.created_at,
            wc.updated_at,
          ]
        );
        results.water_consumption += 1;
      }

      for (const p of payments) {
        if (!p.uuid) continue;
        await q(
          connection,
          `INSERT INTO payments (uuid, user_uuid, consumption_uuid, amount, payment_method, transaction_id, upi_id, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
           ON DUPLICATE KEY UPDATE
             user_uuid = VALUES(user_uuid),
             consumption_uuid = VALUES(consumption_uuid),
             amount = VALUES(amount),
             payment_method = VALUES(payment_method),
             transaction_id = VALUES(transaction_id),
             upi_id = VALUES(upi_id),
             paid_at = VALUES(paid_at)`,
          [
            p.uuid,
            p.user_uuid,
            p.consumption_uuid,
            p.amount,
            p.payment_method || 'UPI',
            p.transaction_id,
            p.upi_id,
            p.paid_at,
            p.created_at,
          ]
        );
        results.payments += 1;
      }

      for (const s of app_settings) {
        if (!s.setting_key) continue;
        await q(
          connection,
          `INSERT INTO app_settings (setting_key, setting_value, description, updated_at)
           VALUES (?, ?, ?, COALESCE(?, NOW()))
           ON DUPLICATE KEY UPDATE
             setting_value = VALUES(setting_value),
             description = VALUES(description),
             updated_at = VALUES(updated_at)`,
          [s.setting_key, s.setting_value, s.description || null, s.updated_at]
        );
        results.app_settings += 1;
      }
    });

    res.json({ message: 'Restore completed', results });
  } catch (err) {
    console.error('Backup restore error:', err);
    results.errors.push(err.message);
    res.status(500).json({ message: 'Failed to restore backup', error: err.message, results });
  }
};
