const pool = require('../db/connection/connection');

class Notification {
    static create(uuid, user_id, notification_details, related_to, callback) {
        const now = new Date();
        pool.query(
            `INSERT INTO notifications
            (uuid, user_id, notification_details, related_to, is_read, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)`,
            [uuid, user_id, notification_details, related_to, now, now],
            callback
        );
    }

    static getByUserId(user_id, callback) {
        pool.query(
            `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
            [user_id],
            callback
        );
    }

    static getByUuid(uuid, callback) {
        pool.query(`SELECT * FROM notifications WHERE uuid = ? LIMIT 1`, [uuid], callback);
    }

    static getPaymentNotificationsByUserId(user_id, related_to, callback) {
        pool.query(
            `SELECT n.*, u.full_name, u.mobile_number, u.connection_id
             FROM notifications n
             LEFT JOIN users u ON u.uuid = n.user_id
             WHERE n.user_id = ? AND n.related_to = ?
             ORDER BY n.is_read ASC, n.created_at DESC`,
            [user_id, related_to],
            callback
        );
    }

    static getUnreadCountByUserId(user_id, related_to, callback) {
        pool.query(
            `SELECT COUNT(*) AS total
             FROM notifications
             WHERE user_id = ? AND related_to = ? AND is_read = 0`,
            [user_id, related_to],
            callback
        );
    }

    static getAllWithUsers(callback) {
        pool.query(
            `SELECT n.*, u.full_name, u.mobile_number, u.connection_id
             FROM notifications n
             LEFT JOIN users u ON u.uuid = n.user_id
             ORDER BY n.is_read ASC, n.created_at DESC`,
            callback
        );
    }

    static getUnreadCount(callback) {
        pool.query(
            `SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0`,
            callback
        );
    }

    static markRead(uuid, callback) {
        const now = new Date();
        pool.query(
            `UPDATE notifications SET is_read = 1, updated_at = ? WHERE uuid = ?`,
            [now, uuid],
            callback
        );
    }

    static markAllPaymentRead(callback) {
        const now = new Date();
        pool.query(
            `UPDATE notifications
             SET is_read = 1, updated_at = ?
             WHERE related_to = ?`,
            [now, 'PAYMENT'],
            callback
        );
    }

    static markAllPaymentReadByUser(user_id, callback) {
        const now = new Date();
        pool.query(
            `UPDATE notifications
             SET is_read = 1, updated_at = ?
             WHERE user_id = ? AND related_to = ?`,
            [now, user_id, 'PAYMENT'],
            callback
        );
    }
}

module.exports = Notification;
