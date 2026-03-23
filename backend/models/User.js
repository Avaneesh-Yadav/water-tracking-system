const pool = require('../db/connection/connection');
const crypto = require("crypto"); 
// payment_status removed: derived from water_consumption (any UNPAID => PENDING)
const userColumns = 'uuid, full_name, mobile_number, role, address, status, connection_id, created_at, updated_at';

class User {
    constructor(id, uuid, fullName, mobileNumber, password, role, address, status, created_at, updated_at) {
        this.id = id;
        this.uuid = uuid;
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.password = password;
        this.role = role;
        this.address = address;
        this.status = status;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static generateConnectionId() {
        const prefix = "WTR-";
        const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
        return `${prefix}${randomPart}`;
    }

    static create(uuid, fullName, mobileNumber, password, role, address, status, callback) {
        const now = new Date();
        const connectionId = this.generateConnectionId();
        pool.query(
            `INSERT INTO users 
            (uuid, full_name, mobile_number, password, role, address, status, connection_id, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, fullName, mobileNumber, password, role, address, status || 'ACTIVE', connectionId, now, now],
            callback
        );
    }

    static getAll(callback) {
    pool.query(`SELECT ${userColumns} FROM users`, callback);
}

    static getAllSearch(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAll(callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT ${userColumns} FROM users WHERE full_name LIKE ? OR mobile_number LIKE ? OR connection_id LIKE ?`,
            [term, term, term],
            callback
        );
    }

    static getAllPaginated(page, limit, callback) {
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT ${userColumns} FROM users ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [lim, offset],
            callback
        );
    }

    static getCount(callback) {
        pool.query('SELECT COUNT(*) as total FROM users', callback);
    }

    static getAllSearchPaginated(q, page, limit, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAllPaginated(page, limit, callback);
        const term = `%${q.trim()}%`;
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT ${userColumns} FROM users WHERE full_name LIKE ? OR mobile_number LIKE ? OR connection_id LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [term, term, term, lim, offset],
            callback
        );
    }

    static getSearchCount(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getCount(callback);
        const term = `%${q.trim()}%`;
        pool.query('SELECT COUNT(*) as total FROM users WHERE full_name LIKE ? OR mobile_number LIKE ? OR connection_id LIKE ?', [term, term, term], callback);
    }

    static getById(id, callback) {
        pool.query(`SELECT ${userColumns} FROM users WHERE id = ?`, [id], callback);
    }

    static getByUuid(uuid, callback) {
        pool.query(`SELECT ${userColumns} FROM users WHERE uuid = ?`, [uuid], callback);
    }

    static getByPhone(mobileNumber, callback) {
        pool.query('SELECT * FROM users WHERE mobile_number = ?', [mobileNumber], callback);
    }

    static update(uuid, fullName, mobileNumber, role, address, status, callback) {
        const now = new Date();
        pool.query(
            `UPDATE users 
             SET full_name = ?, mobile_number = ?, role = ?, address = ?, status = ?, updated_at = ? 
             WHERE uuid = ?`,
            [fullName, mobileNumber, role, address, status, now, uuid],
            callback
        );
    }

    static delete(uuid, callback) {
        console.log("uuid" ,uuid);
        
        pool.query('DELETE FROM users WHERE uuid = ?', [uuid], callback);
    }

    static updatePassword(uuid, hashedPassword, callback) {
        const now = new Date();
        pool.query(
            'UPDATE users SET password = ?, updated_at = ? WHERE uuid = ?',
            [hashedPassword, now, uuid],
            callback
        );
    }
}

module.exports = User;
