const pool = require('../db/connection/connection');

// GET /user/summary
exports.getSummary = (req, res) => {
  const user_uuid = req.user?.uuid;
  if (!user_uuid) return res.status(401).json({ message: 'Unauthorized' });

  pool.query(
    `SELECT uuid, full_name, connection_id FROM users WHERE uuid = ?`,
    [user_uuid],
    (uErr, uRows) => {
      if (uErr) {
        console.error('getSummary user:', uErr);
        return res.status(500).json({ message: 'Failed to load summary' });
      }
      const u = uRows && uRows[0];
      if (!u) return res.status(404).json({ message: 'User not found' });

      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS due_amount,
                COUNT(*) AS unpaid_count
         FROM water_consumption
         WHERE user_uuid = ? AND payment_status = 'UNPAID'`,
        [user_uuid],
        (dErr, dRows) => {
          if (dErr) {
            console.error('getSummary due:', dErr);
            return res.status(500).json({ message: 'Failed to load summary' });
          }
          const due_amount = parseFloat(dRows[0]?.due_amount) || 0;
          const unpaid_count = parseInt(dRows[0]?.unpaid_count, 10) || 0;

          pool.query(
            `SELECT p.amount, p.paid_at, wc.month, wc.year
             FROM payments p
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid
             WHERE p.user_uuid = ?
             ORDER BY p.paid_at DESC
             LIMIT 1`,
            [user_uuid],
            (pErr, pRows) => {
              if (pErr) {
                console.error('getSummary payment:', pErr);
                return res.status(500).json({ message: 'Failed to load summary' });
              }
              const lp = pRows && pRows[0];
              const last_payment = lp
                ? {
                    amount: parseFloat(lp.amount) || 0,
                    paid_at: lp.paid_at,
                    month: lp.month,
                    year: lp.year,
                  }
                : null;

              pool.query(
                `SELECT month, year, consumption_liters, created_at
                 FROM water_consumption
                 WHERE user_uuid = ?
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [user_uuid],
                (rErr, rRows) => {
                  if (rErr) {
                    console.error('getSummary reading:', rErr);
                    return res.status(500).json({ message: 'Failed to load summary' });
                  }
                  const lr = rRows && rRows[0];
                  const last_reading = lr
                    ? {
                        month: lr.month,
                        year: lr.year,
                        consumption_liters: parseFloat(lr.consumption_liters) || 0,
                        created_at: lr.created_at,
                      }
                    : null;

                  res.json({
                    due_amount,
                    unpaid_count,
                    last_payment,
                    last_reading,
                    connection_id: u.connection_id,
                    full_name: u.full_name,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

// GET /user/bill/:consumption_uuid
exports.getBillData = (req, res) => {
  const user_uuid = req.user?.uuid;
  const { consumption_uuid } = req.params;
  if (!user_uuid) return res.status(401).json({ message: 'Unauthorized' });
  if (!consumption_uuid) return res.status(400).json({ message: 'consumption uuid required' });

  pool.query(
    `SELECT wc.*, u.connection_id, u.full_name, u.address, u.mobile_number
     FROM water_consumption wc
     JOIN users u ON wc.user_uuid = u.uuid
     WHERE wc.uuid = ? AND wc.user_uuid = ?`,
    [consumption_uuid, user_uuid],
    (err, rows) => {
      if (err) {
        console.error('getBillData:', err);
        return res.status(500).json({ message: 'Failed to load bill' });
      }
      if (!rows || !rows.length) return res.status(404).json({ message: 'Bill not found' });
      const wc = rows[0];

      pool.query(
        `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('organization_name', 'bill_due_day')`,
        (sErr, sRows) => {
          const map = {};
          (sRows || []).forEach((r) => {
            map[r.setting_key] = r.setting_value;
          });
          const organization_name = map.organization_name || 'Water Supply';
          const bill_due_day = Math.min(28, Math.max(1, parseInt(map.bill_due_day, 10) || 10));

          res.json({
            consumption_uuid: wc.uuid,
            connection_id: wc.connection_id,
            full_name: wc.full_name,
            address: wc.address,
            mobile_number: wc.mobile_number,
            month: wc.month,
            year: wc.year,
            consumption_liters: parseFloat(wc.consumption_liters) || 0,
            rate_per_liter: parseFloat(wc.rate_per_liter) || 0,
            amount: parseFloat(wc.amount) || 0,
            payment_status: wc.payment_status,
            organization_name,
            bill_due_day,
            previous_meter_reading: wc.previous_meter_reading != null ? parseFloat(wc.previous_meter_reading) : null,
            current_meter_reading: wc.current_meter_reading != null ? parseFloat(wc.current_meter_reading) : null,
            meter_photo_path: wc.meter_photo_path || null,
          });
        }
      );
    }
  );
};

// GET /admin/bill/:consumption_uuid — same payload as user bill (admin)
exports.getBillDataAdmin = (req, res) => {
  const { consumption_uuid } = req.params;
  if (!consumption_uuid) return res.status(400).json({ message: 'consumption uuid required' });

  pool.query(
    `SELECT wc.*, u.connection_id, u.full_name, u.address, u.mobile_number
     FROM water_consumption wc
     JOIN users u ON wc.user_uuid = u.uuid
     WHERE wc.uuid = ?`,
    [consumption_uuid],
    (err, rows) => {
      if (err) {
        console.error('getBillDataAdmin:', err);
        return res.status(500).json({ message: 'Failed to load bill' });
      }
      if (!rows || !rows.length) return res.status(404).json({ message: 'Bill not found' });
      const wc = rows[0];

      pool.query(
        `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('organization_name', 'bill_due_day')`,
        (sErr, sRows) => {
          const map = {};
          (sRows || []).forEach((r) => {
            map[r.setting_key] = r.setting_value;
          });
          const organization_name = map.organization_name || 'Water Supply';
          const bill_due_day = Math.min(28, Math.max(1, parseInt(map.bill_due_day, 10) || 10));

          res.json({
            consumption_uuid: wc.uuid,
            connection_id: wc.connection_id,
            full_name: wc.full_name,
            address: wc.address,
            mobile_number: wc.mobile_number,
            month: wc.month,
            year: wc.year,
            consumption_liters: parseFloat(wc.consumption_liters) || 0,
            rate_per_liter: parseFloat(wc.rate_per_liter) || 0,
            amount: parseFloat(wc.amount) || 0,
            payment_status: wc.payment_status,
            organization_name,
            bill_due_day,
            previous_meter_reading: wc.previous_meter_reading != null ? parseFloat(wc.previous_meter_reading) : null,
            current_meter_reading: wc.current_meter_reading != null ? parseFloat(wc.current_meter_reading) : null,
            meter_photo_path: wc.meter_photo_path || null,
          });
        }
      );
    }
  );
};
