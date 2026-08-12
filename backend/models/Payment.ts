import pool from '../db/connection/connection';
import type { RowDataPacket } from 'mysql2';

class Payment {
    id?: number;
    uuid?: string;
    user_uuid?: string;
    consumption_uuid?: string;
    amount?: number;
    payment_method?: string;
    transaction_id?: string;
    upi_id?: string | null;
    paid_at?: Date;
    created_at?: Date;

    constructor(id?: number, uuid?: string, user_uuid?: string, consumption_uuid?: string, amount?: number, payment_method?: string, transaction_id?: string, upi_id?: string | null, paid_at?: Date, created_at?: Date) {
        this.id = id;
        this.uuid = uuid;
        this.user_uuid = user_uuid;
        this.consumption_uuid = consumption_uuid;
        this.amount = amount;
        this.payment_method = payment_method;
        this.transaction_id = transaction_id;
        this.upi_id = upi_id;
        this.paid_at = paid_at;
        this.created_at = created_at;
    }

    static create(uuid, user_uuid, consumption_uuid, amount, payment_method, transaction_id, upi_id, callback) {
        const now = new Date();

        pool.query(
            `INSERT INTO payments 
            (uuid, user_uuid, consumption_uuid, amount, payment_method, transaction_id, upi_id, paid_at, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, user_uuid, consumption_uuid, amount, payment_method, transaction_id, upi_id, now, now],
            callback
        );
    }

    static getByUserUuid(user_uuid, callback) {
        pool.query(
            `SELECT p.*, wc.month, wc.year 
             FROM payments p 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.user_uuid = ? 
             ORDER BY p.paid_at DESC`,
            [user_uuid],
            callback
        );
    }

    static getByUuid(uuid, callback) {
        pool.query('SELECT * FROM payments WHERE uuid = ?', [uuid], callback);
    }

    static getByTransactionId(transaction_id, callback) {
        pool.query('SELECT * FROM payments WHERE transaction_id = ?', [transaction_id], callback);
    }

    static getAll(callback) {
        pool.query(
            `SELECT p.*, u.full_name, u.mobile_number, u.connection_id, wc.month, wc.year 
             FROM payments p 
             JOIN users u ON p.user_uuid = u.uuid 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             ORDER BY p.paid_at DESC`,
            callback
        );
    }

    static getAllSearch(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAll(callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT p.*, u.full_name, u.mobile_number, u.connection_id, wc.month, wc.year 
             FROM payments p 
             JOIN users u ON p.user_uuid = u.uuid 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.transaction_id LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ?
                OR CAST(p.amount AS CHAR) LIKE ? OR u.connection_id LIKE ?
             ORDER BY p.paid_at DESC`,
            [term, term, term, term, term],
            callback
        );
    }

    static getAllPaginated(page, limit, callback) {
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT p.*, u.full_name, u.mobile_number, u.connection_id, wc.month, wc.year 
             FROM payments p 
             JOIN users u ON p.user_uuid = u.uuid 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             ORDER BY p.paid_at DESC LIMIT ? OFFSET ?`,
            [lim, offset],
            callback
        );
    }

    static getAllCount(callback) {
        pool.query('SELECT COUNT(*) as total FROM payments', callback);
    }

    /** Payments recorded in the current calendar month (server local / DB CURDATE) */
    static getCurrentMonthAll(callback) {
        pool.query(
            `SELECT p.*, u.full_name, u.mobile_number, u.connection_id, wc.month, wc.year
             FROM payments p
             JOIN users u ON p.user_uuid = u.uuid
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid
             WHERE YEAR(p.paid_at) = YEAR(CURDATE()) AND MONTH(p.paid_at) = MONTH(CURDATE())
             ORDER BY p.paid_at DESC`,
            callback
        );
    }

    static getAllSearchPaginated(q, page, limit, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAllPaginated(page, limit, callback);
        const term = `%${q.trim()}%`;
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(50, Math.max(1, limit));
        pool.query(
            `SELECT p.*, u.full_name, u.mobile_number, u.connection_id, wc.month, wc.year 
             FROM payments p 
             JOIN users u ON p.user_uuid = u.uuid 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.transaction_id LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ?
                OR CAST(p.amount AS CHAR) LIKE ? OR u.connection_id LIKE ?
             ORDER BY p.paid_at DESC LIMIT ? OFFSET ?`,
            [term, term, term, term, term, lim, offset],
            callback
        );
    }

    static getAllSearchCount(q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) return this.getAllCount(callback);
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT COUNT(*) as total FROM payments p 
             JOIN users u ON p.user_uuid = u.uuid 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.transaction_id LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ?
                OR CAST(p.amount AS CHAR) LIKE ? OR u.connection_id LIKE ?`,
            [term, term, term, term, term],
            callback
        );
    }

    static getByUserUuidPaginated(user_uuid, page, limit, callback) {
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const lim = Math.min(100, Math.max(1, limit));
        pool.query(
            `SELECT p.*, wc.month, wc.year 
             FROM payments p 
             LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.user_uuid = ? 
             ORDER BY p.paid_at DESC 
             LIMIT ? OFFSET ?`,
            [user_uuid, lim, offset],
            callback
        );
    }

    static getByUserUuidCount(user_uuid, callback) {
        pool.query('SELECT COUNT(*) as total FROM payments WHERE user_uuid = ?', [user_uuid], callback);
    }

    static getByUserUuidSearch(user_uuid, q, callback) {
        if (!q || typeof q !== 'string' || !q.trim()) {
            return this.getByUserUuid(user_uuid, callback);
        }
        const term = `%${q.trim()}%`;
        pool.query(
            `SELECT p.*, wc.month, wc.year FROM payments p LEFT JOIN water_consumption wc ON p.consumption_uuid = wc.uuid 
             WHERE p.user_uuid = ? AND (p.transaction_id LIKE ? OR wc.month LIKE ? OR CAST(wc.year AS CHAR) LIKE ?) 
             ORDER BY p.paid_at DESC`,
            [user_uuid, term, term, term],
            callback
        );
    }

    static getTotalPaidByUser(user_uuid, callback) {
        pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE user_uuid = ?',
            [user_uuid],
            callback
        );
    }

    static delete(uuid, callback) {
        pool.query('DELETE FROM payments WHERE uuid = ?', [uuid], callback);
    }
}

export default Payment;
