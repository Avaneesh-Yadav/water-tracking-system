const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection/connection');

/**
 * audit_log table (see schema):
 * id, uuid, user_uuid, user_role, action, entity_type, entity_id, details (JSON), ip_address, created_at
 */
class AuditLog {
  static create({ user_uuid, user_role, action, entity_type, entity_id, details, ip_address }, callback) {
    const uuid = uuidv4();
    const now = new Date();
    pool.query(
      `INSERT INTO audit_log (uuid, user_uuid, user_role, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        user_uuid,
        user_role || 'ADMIN',
        action,
        entity_type || null,
        entity_id || null,
        details ? JSON.stringify(details) : null,
        ip_address || null,
        now,
      ],
      callback
    );
  }

  /**
   * @param {object} opts - from, to, action, user_uuid, page, limit
   * @param {function} callback - (err, { logs, total, page, limit })
   */
  static getFiltered(opts, callback) {
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(opts.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (opts.from) {
      conditions.push('created_at >= ?');
      params.push(opts.from);
    }
    if (opts.to) {
      conditions.push('created_at <= ?');
      params.push(opts.to);
    }
    if (opts.action) {
      conditions.push('action LIKE ?');
      params.push(`%${opts.action}%`);
    }
    if (opts.user_uuid) {
      conditions.push('user_uuid = ?');
      params.push(opts.user_uuid);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM audit_log ${where}`;
    const listSql = `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    pool.query(countSql, params, (errCount, countRows) => {
      if (errCount) return callback(errCount);
      const total = countRows && countRows[0] ? parseInt(countRows[0].total, 10) || 0 : 0;

      pool.query(listSql, [...params, limit, offset], (err, rows) => {
        if (err) return callback(err);
        const logs = (rows || []).map((r) => ({
          ...r,
          details:
            typeof r.details === 'string'
              ? (() => {
                  try {
                    return JSON.parse(r.details);
                  } catch {
                    return r.details;
                  }
                })()
              : r.details,
        }));
        callback(null, { logs, total, page, limit });
      });
    });
  }
}

module.exports = AuditLog;
