const pool = require('../db/connection/connection');
const crypto = require('crypto');

class WaterConsumption {
    constructor(id, uuid, user_uuid, month, year, consumption_liters, rate_per_liter, payment_status, created_at, updated_at) {
        this.id = id;
        this.uuid = uuid;
        this.user_uuid = user_uuid;
        this.month = month;
        this.year = year;
        this.consumption_liters = consumption_liters;
        this.rate_per_liter = rate_per_liter;
        this.payment_status = payment_status;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static create(uuid, user_uuid, month, year, consumption_liters, rate_per_liter, optsOrCb, maybeCb) {
        let opts = {};
        let callback = maybeCb;
        if (typeof optsOrCb === 'function') {
            callback = optsOrCb;
        } else if (optsOrCb && typeof optsOrCb === 'object') {
            opts = optsOrCb;
        }
        const now = new Date();
        const payment_status = 'UNPAID';
        const amount = consumption_liters * rate_per_liter;
        const prev = opts.previous_meter_reading != null ? parseFloat(opts.previous_meter_reading) : null;
        const curr = opts.current_meter_reading != null ? parseFloat(opts.current_meter_reading) : null;
        const photo = opts.meter_photo_path || null;

        pool.query(
            `INSERT INTO water_consumption 
            (uuid, user_uuid, month, year, consumption_liters, previous_meter_reading, current_meter_reading, meter_photo_path, rate_per_liter, amount, payment_status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, user_uuid, month, year, consumption_liters, prev, curr, photo, rate_per_liter, amount, payment_status, now, now],
            callback
        );
    }

    static getByUserUuid(user_uuid, callback) {
        pool.query(
            `SELECT * FROM water_consumption WHERE user_uuid = ? ORDER BY year DESC, 
            FIELD(month, 'December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January')`,
            [user_uuid],
            callback
        );
    }

    static getByUuid(uuid, callback) {
        pool.query('SELECT * FROM water_consumption WHERE uuid = ?', [uuid], callback);
    }

    // Fetch amount for many consumptions (for user + unpaid only).
    // Used to split "total due" payment into per-bill notifications.
    static getAmountsByUuidsForUser(user_uuid, uuids, callback) {
        if (!uuids || uuids.length === 0) return callback(null, []);
        const placeholders = uuids.map(() => '?').join(',');
        pool.query(
            `SELECT uuid, amount
             FROM water_consumption
             WHERE user_uuid = ? AND payment_status = 'UNPAID' AND uuid IN (${placeholders})`,
            [user_uuid, ...uuids],
            callback
        );
    }

    static getPaymentStatusByUuidsForUser(user_uuid, uuids, callback) {
        if (!uuids || uuids.length === 0) return callback(null, []);
        const placeholders = uuids.map(() => '?').join(',');
        pool.query(
            `SELECT uuid, payment_status
             FROM water_consumption
             WHERE user_uuid = ? AND uuid IN (${placeholders})`,
            [user_uuid, ...uuids],
            callback
        );
    }

    static getUnpaidByUserUuid(user_uuid, callback) {
        pool.query(
            'SELECT * FROM water_consumption WHERE user_uuid = ? AND payment_status = ? ORDER BY year ASC, created_at ASC',
            [user_uuid, 'UNPAID'],
            callback
        );
    }

    static getDueAmount(user_uuid, callback) {
        pool.query(
            'SELECT COALESCE(SUM(amount), 0) as due_amount FROM water_consumption WHERE user_uuid = ? AND payment_status = ?',
            [user_uuid, 'UNPAID'],
            callback
        );
    }

    static updateStatus(uuid, payment_status, callback) {
        const now = new Date();
        pool.query(
            'UPDATE water_consumption SET payment_status = ?, updated_at = ? WHERE uuid = ?',
            [payment_status, now, uuid],
            callback
        );
    }

    // Mark all given UUIDs as PAID; only updates rows for this user_uuid (security)
    static updateStatusBulk(user_uuid, uuids, payment_status, callback) {
        if (!uuids || uuids.length === 0) return callback(null, { affectedRows: 0 });
        const now = new Date();
        const placeholders = uuids.map(() => '?').join(',');
        pool.query(
            `UPDATE water_consumption SET payment_status = ?, updated_at = ? WHERE user_uuid = ? AND uuid IN (${placeholders})`,
            [payment_status, now, user_uuid, ...uuids],
            callback
        );
    }

    static update(uuid, consumption_liters, rate_per_liter, optsOrCb, maybeCb) {
        let opts = {};
        let callback = maybeCb;
        if (typeof optsOrCb === 'function') {
            callback = optsOrCb;
            opts = {};
        } else if (optsOrCb && typeof optsOrCb === 'object') {
            opts = optsOrCb;
        }
        const now = new Date();
        const amount = consumption_liters * rate_per_liter;

        const parts = ['consumption_liters = ?', 'rate_per_liter = ?', 'amount = ?', 'updated_at = ?'];
        const vals = [consumption_liters, rate_per_liter, amount, now];

        if (opts && opts.previous_meter_reading !== undefined) {
            parts.push('previous_meter_reading = ?');
            vals.push(opts.previous_meter_reading == null ? null : parseFloat(opts.previous_meter_reading));
        }
        if (opts && opts.current_meter_reading !== undefined) {
            parts.push('current_meter_reading = ?');
            vals.push(opts.current_meter_reading == null ? null : parseFloat(opts.current_meter_reading));
        }
        if (opts && opts.meter_photo_path !== undefined) {
            parts.push('meter_photo_path = ?');
            vals.push(opts.meter_photo_path);
        }

        vals.push(uuid);
        pool.query(`UPDATE water_consumption SET ${parts.join(', ')} WHERE uuid = ?`, vals, callback);
    }

    static updateMeterPhotoPath(uuid, meter_photo_path, callback) {
        const now = new Date();
        pool.query(
            'UPDATE water_consumption SET meter_photo_path = ?, updated_at = ? WHERE uuid = ?',
            [meter_photo_path, now, uuid],
            callback
        );
    }

    static delete(uuid, callback) {
        pool.query('DELETE FROM water_consumption WHERE uuid = ?', [uuid], callback);
    }

    static getAll(callback) {
        pool.query(
            `SELECT wc.*, u.full_name, u.mobile_number, u.connection_id 
             FROM water_consumption wc 
             JOIN users u ON wc.user_uuid = u.uuid 
             ORDER BY wc.created_at DESC`,
            callback
        );
    }

    static getAllSearch(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAll(callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT wc.*, u.full_name, u.mobile_number, u.connection_id 
             FROM water_consumption wc 
             JOIN users u ON wc.user_uuid = u.uuid 
             WHERE CAST(wc.consumption_liters AS CHAR) LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ? OR u.connection_id LIKE ?
             ORDER BY wc.created_at DESC`,
            [term, term, term, term],
            callback
        );
    }

    static getAllPaginated(page, limit, callback) {
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT wc.*, u.full_name, u.mobile_number, u.connection_id 
             FROM water_consumption wc 
             JOIN users u ON wc.user_uuid = u.uuid 
             ORDER BY wc.created_at DESC LIMIT ? OFFSET ?`,
            [lim, offset],
            callback
        );
    }

    static getAllCount(callback) {
        pool.query('SELECT COUNT(*) as total FROM water_consumption', callback);
    }

    static getAllSearchPaginated(q, page, limit, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAllPaginated(page, limit, callback);
        const term = `%${q.trim()}%`;
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT wc.*, u.full_name, u.mobile_number, u.connection_id 
             FROM water_consumption wc 
             JOIN users u ON wc.user_uuid = u.uuid 
             WHERE CAST(wc.consumption_liters AS CHAR) LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ? OR u.connection_id LIKE ?
             ORDER BY wc.created_at DESC LIMIT ? OFFSET ?`,
            [term, term, term, term, lim, offset],
            callback
        );
    }

    static getAllSearchCount(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAllCount(callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT COUNT(*) as total FROM water_consumption wc JOIN users u ON wc.user_uuid = u.uuid 
             WHERE CAST(wc.consumption_liters AS CHAR) LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ? OR u.connection_id LIKE ?`,
            [term, term, term, term],
            callback
        );
    }

    static getByUserUuidPaginated(user_uuid, page, limit, callback) {
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(100, Math.max(1, limit));
        pool.query(
            `SELECT * FROM water_consumption WHERE user_uuid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [user_uuid, lim, offset],
            callback
        );
    }

    static getByUserUuidCount(user_uuid, callback) {
        pool.query('SELECT COUNT(*) as total FROM water_consumption WHERE user_uuid = ?', [user_uuid], callback);
    }

    static getByUserUuidSearch(user_uuid, q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getByUserUuid(user_uuid, callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT * FROM water_consumption WHERE user_uuid = ? AND (CAST(consumption_liters AS CHAR) LIKE ? OR month LIKE ? OR CAST(year AS CHAR) LIKE ?) ORDER BY created_at DESC`,
            [user_uuid, term, term, term],
            callback
        );
    }

    /** All UNPAID rows with consumer identity (admin dashboard / reports) */
    static getAllUnpaidWithUser(callback) {
        const monthOrder =
            "FIELD(wc.month, 'December','November','October','September','August','July','June','May','April','March','February','January')";
        pool.query(
            `SELECT wc.*, u.full_name, u.mobile_number, u.connection_id
             FROM water_consumption wc
             JOIN users u ON wc.user_uuid = u.uuid
             WHERE wc.payment_status = 'UNPAID'
             ORDER BY wc.year DESC, ${monthOrder} DESC, wc.created_at DESC`,
            callback
        );
    }
}

module.exports = WaterConsumption;
