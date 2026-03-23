const bcrypt = require('bcryptjs');
const User = require('../models/User');
const pool = require('../db/connection/connection');

// Derive payment_status and dueAmount from water_consumption (any UNPAID => PENDING)
function getPaymentStatusByUserUuids(userUuids, callback) {
    if (!userUuids || userUuids.length === 0) return callback(null, {});
    const placeholders = userUuids.map(() => '?').join(',');
    pool.query(
        `SELECT user_uuid,
                COALESCE(SUM(CASE WHEN payment_status = 'UNPAID' THEN amount ELSE 0 END), 0) AS due_amount
         FROM water_consumption
         WHERE user_uuid IN (${placeholders})
         GROUP BY user_uuid`,
        userUuids,
        (err, rows) => {
            if (err) return callback(err);
            const map = {};
            userUuids.forEach(uuid => {
                map[uuid] = { dueAmount: 0, payment_status: 'COMPLETED' };
            });
            rows.forEach(r => {
                const due = parseFloat(r.due_amount) || 0;
                map[r.user_uuid] = {
                    dueAmount: due,
                    payment_status: due > 0 ? 'PENDING' : 'COMPLETED'
                };
            });
            callback(null, map);
        }
    );
}

exports.getAllUsers = (req, res) => {
    const q = (req.query.q || '').trim();
    const hasPagination = req.query.page != null || req.query.limit != null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

    const attachPaymentStatus = (results, cb) => {
        if (!results || results.length === 0) return cb(null, results);
        const uuids = results.map(r => r.uuid);
        getPaymentStatusByUserUuids(uuids, (err, map) => {
            if (err) return cb(err);
            const out = results.map(u => {
                const p = map[u.uuid] || { dueAmount: 0, payment_status: 'COMPLETED' };
                return { ...u, dueAmount: p.dueAmount, payment_status: p.payment_status };
            });
            cb(null, out);
        });
    };

    if (!hasPagination) {
        const fn = q ? (c) => User.getAllSearch(q, c) : User.getAll;
        return fn((err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            attachPaymentStatus(results, (errAttach, withStatus) => {
                if (errAttach) return res.status(500).json({ message: 'Database error' });
                res.json(withStatus);
            });
        });
    }

    const onCount = (errCount, countRows) => {
        if (errCount) return res.status(500).json({ message: 'Database error' });
        const total = countRows[0]?.total || 0;
        const fetch = q ? (c) => User.getAllSearchPaginated(q, page, limit, c) : (c) => User.getAllPaginated(page, limit, c);
        fetch((err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            attachPaymentStatus(results, (errAttach, withStatus) => {
                if (errAttach) return res.status(500).json({ message: 'Database error' });
                res.json({ users: withStatus, total, page, limit });
            });
        });
    };
    if (q) User.getSearchCount(q, onCount);
    else User.getCount(onCount);
};

exports.getUserById = (req, res) => {
    const { id } = req.params;
    User.getById(id, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
    });
};
exports.getUserByUuid = (req, res) => {
    const { uuid } = req.params;
    User.getByUuid(uuid, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = results[0];
        getPaymentStatusByUserUuids([user.uuid], (errMap, map) => {
            if (errMap) return res.status(500).json({ message: 'Database error' });
            const p = map[user.uuid] || { dueAmount: 0, payment_status: 'COMPLETED' };
            res.json({ ...user, dueAmount: p.dueAmount, payment_status: p.payment_status });
        });
    });
};

exports.updateUser = (req, res) => {
    const { uuid } = req.params;
    const { fullName, mobileNumber, role, address, status } = req.body;
    User.update(uuid, fullName, mobileNumber, role, address, status, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'User updated successfully' });
    });
};

exports.deleteUser = (req, res) => {
    const { uuid } = req.params;
    User.delete(uuid, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'User deleted successfully' });
    });
};

// Update own profile (for logged-in user)
exports.updateProfile = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;
        const { fullName, address, currentPassword, newPassword } = req.body;

        // Get current user data
        User.getByUuid(user_uuid, async (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const user = results[0];
            const updates = [];
            const values = [];

            // Update name if provided
            if (fullName && fullName !== user.full_name) {
                updates.push('full_name = ?');
                values.push(fullName);
            }

            // Update address if provided
            if (address && address !== user.address) {
                updates.push('address = ?');
                values.push(address);
            }

            // Update password if provided
            if (newPassword) {
                if (!currentPassword) {
                    return res.status(400).json({ message: 'Current password is required to change password' });
                }

                // Verify current password
                const currentUser = await new Promise((resolve, reject) => {
                    User.getByPhone(user.mobile_number, (err, results) => {
                        if (err) reject(err);
                        else resolve(results[0]);
                    });
                });

                const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Current password is incorrect' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 8);
                updates.push('password = ?');
                values.push(hashedPassword);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'No changes to update' });
            }

            updates.push('updated_at = ?');
            values.push(new Date());
            values.push(user_uuid);

            const query = `UPDATE users SET ${updates.join(', ')} WHERE uuid = ?`;

            pool.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error updating profile:', err);
                    return res.status(500).json({ message: 'Failed to update profile' });
                }

                res.status(200).json({
                    message: 'Profile updated successfully',
                    updated: {
                        fullName: fullName || user.full_name,
                        address: address || user.address,
                        passwordChanged: !!newPassword
                    }
                });
            });
        });
    } catch (error) {
        console.error('Exception in updateProfile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
