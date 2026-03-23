const pool = require('../db/connection/connection');

class Settings {
    static get(key, callback) {
        pool.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key], callback);
    }

    static set(key, value, callback) {
        const now = new Date();
        pool.query(
            `INSERT INTO app_settings (setting_key, setting_value, updated_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = ?`,
            [key, value, now, value, now],
            callback
        );
    }

    static getAll(callback) {
        pool.query('SELECT * FROM app_settings', callback);
    }

    // Convenience methods for common settings
    static getRatePerLiter(callback) {
        this.get('rate_per_liter', (err, results) => {
            if (err) return callback(err, null);
            const rate = results.length > 0 ? parseFloat(results[0].setting_value) : 20.00;
            callback(null, rate);
        });
    }

    static setRatePerLiter(rate, callback) {
        this.set('rate_per_liter', rate.toString(), callback);
    }

    static getUpiId(callback) {
        this.get('upi_id', (err, results) => {
            if (err) return callback(err, null);
            const upiId = results.length > 0 ? results[0].setting_value : null;
            callback(null, upiId);
        });
    }

    static setUpiId(upiId, callback) {
        this.set('upi_id', upiId, callback);
    }

    static getPayeeName(callback) {
        this.get('payee_name', (err, results) => {
            if (err) return callback(err, null);
            const name = results.length > 0 ? results[0].setting_value : 'Water Supply';
            callback(null, name);
        });
    }

    static setPayeeName(name, callback) {
        this.set('payee_name', name, callback);
    }

    // Organization & branding
    static getOrganizationName(callback) {
        this.get('organization_name', (err, results) => {
            if (err) return callback(err, null);
            const name = results.length > 0 ? results[0].setting_value : 'Water Supply';
            callback(null, name);
        });
    }

    static setOrganizationName(name, callback) {
        this.set('organization_name', name || 'Water Supply', callback);
    }

    static getSupportEmail(callback) {
        this.get('support_email', (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length > 0 ? results[0].setting_value : null);
        });
    }

    static setSupportEmail(email, callback) {
        this.set('support_email', email || '', callback);
    }

    static getSupportPhone(callback) {
        this.get('support_phone', (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length > 0 ? results[0].setting_value : null);
        });
    }

    static setSupportPhone(phone, callback) {
        this.set('support_phone', phone || '', callback);
    }

    // Billing
    static getBillDueDay(callback) {
        this.get('bill_due_day', (err, results) => {
            if (err) return callback(err, null);
            const day = results.length > 0 ? parseInt(results[0].setting_value, 10) : 10;
            callback(null, isNaN(day) || day < 1 || day > 28 ? 10 : day);
        });
    }

    static setBillDueDay(day, callback) {
        const d = Math.min(28, Math.max(1, parseInt(day, 10) || 10));
        this.set('bill_due_day', d.toString(), callback);
    }

    static getCurrencyDisplay(callback) {
        this.get('currency_display', (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length > 0 ? results[0].setting_value : 'INR');
        });
    }

    static setCurrencyDisplay(value, callback) {
        this.set('currency_display', value || 'INR', callback);
    }

    static getUnitLabel(callback) {
        this.get('unit_label', (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length > 0 ? results[0].setting_value : 'Liters');
        });
    }

    static setUnitLabel(value, callback) {
        this.set('unit_label', value || 'Liters', callback);
    }
}

module.exports = Settings;
