const { v4: uuidv4 } = require('uuid');
const WaterConsumption = require('../models/WaterConsumption');
const Settings = require('../models/Settings');

// Backward compatibility: API exposes both payment_status and status for consumption rows
const mapConsumptionStatus = (r) => ({ ...r, status: r.payment_status ?? r.status });

// Add consumption record (Admin only)
exports.addConsumption = async (req, res) => {
    try {
        const { user_uuid, month, year, consumption_liters, rate_per_liter } = req.body;

        if (!user_uuid || !month || !year || !consumption_liters) {
            return res.status(400).json({ message: 'User UUID, month, year, and consumption are required' });
        }

        // Get rate per liter - use provided or get from settings
        const rate = rate_per_liter || await new Promise((resolve, reject) => {
            Settings.getRatePerLiter((err, rate) => {
                if (err) reject(err);
                else resolve(rate);
            });
        });

        const uuid = uuidv4();

        WaterConsumption.create(
            uuid,
            user_uuid,
            month,
            parseInt(year),
            parseFloat(consumption_liters),
            parseFloat(rate),
            (err, result) => {
                if (err) {
                    console.error('Error creating consumption record:', err);
                    return res.status(500).json({
                        message: 'Failed to create consumption record',
                        error: err.message
                    });
                }

                const amount = parseFloat(consumption_liters) * parseFloat(rate);
                res.status(201).json({
                    message: 'Consumption record created successfully',
                    consumption: {
                        uuid,
                        user_uuid,
                        month,
                        year: parseInt(year),
                        consumption_liters: parseFloat(consumption_liters),
                        rate_per_liter: parseFloat(rate),
                        amount,
                        status: 'UNPAID'
                    }
                });
            }
        );
    } catch (error) {
        console.error('Exception in addConsumption:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get consumption history for logged-in user (supports ?page=1&limit=10 and ?q= for search)
exports.getConsumptionHistory = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;
        const q = (req.query.q || '').trim();

        if (q) {
            WaterConsumption.getByUserUuidSearch(user_uuid, q, (err, results) => {
                if (err) {
                    console.error('Error fetching consumption history:', err);
                    return res.status(500).json({ message: 'Failed to fetch consumption history' });
                }
                res.status(200).json({ message: 'Consumption history fetched successfully', history: results.map(mapConsumptionStatus) });
            });
            return;
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

        WaterConsumption.getByUserUuidCount(user_uuid, (errCount, countRows) => {
            if (errCount) {
                console.error('Error counting consumption:', errCount);
                return res.status(500).json({ message: 'Failed to fetch consumption history' });
            }
            const total = countRows[0]?.total || 0;
            WaterConsumption.getByUserUuidPaginated(user_uuid, page, limit, (err, results) => {
                if (err) {
                    console.error('Error fetching consumption history:', err);
                    return res.status(500).json({ message: 'Failed to fetch consumption history' });
                }
                res.status(200).json({
                    message: 'Consumption history fetched successfully',
                    history: results.map(mapConsumptionStatus),
                    total,
                    page,
                    limit
                });
            });
        });
    } catch (error) {
        console.error('Exception in getConsumptionHistory:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get consumption history for specific user (Admin)
exports.getConsumptionHistoryByUser = async (req, res) => {
    try {
        const { user_uuid } = req.params;

        if (!user_uuid) {
            return res.status(400).json({ message: 'User UUID is required' });
        }

        WaterConsumption.getByUserUuid(user_uuid, (err, results) => {
            if (err) {
                console.error('Error fetching consumption history:', err);
                return res.status(500).json({ message: 'Failed to fetch consumption history' });
            }

            res.status(200).json({
                message: 'Consumption history fetched successfully',
                history: results.map(mapConsumptionStatus)
            });
        });
    } catch (error) {
        console.error('Exception in getConsumptionHistoryByUser:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get due amount for logged-in user
exports.getDueAmount = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;

        WaterConsumption.getDueAmount(user_uuid, (err, results) => {
            if (err) {
                console.error('Error fetching due amount:', err);
                return res.status(500).json({ message: 'Failed to fetch due amount' });
            }

            res.status(200).json({
                message: 'Due amount fetched successfully',
                due_amount: results[0]?.due_amount || 0
            });
        });
    } catch (error) {
        console.error('Exception in getDueAmount:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get unpaid bills for logged-in user
exports.getUnpaidBills = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;

        WaterConsumption.getUnpaidByUserUuid(user_uuid, (err, results) => {
            if (err) {
                console.error('Error fetching unpaid bills:', err);
                return res.status(500).json({ message: 'Failed to fetch unpaid bills' });
            }

            res.status(200).json({
                message: 'Unpaid bills fetched successfully',
                bills: results.map(mapConsumptionStatus)
            });
        });
    } catch (error) {
        console.error('Exception in getUnpaidBills:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update consumption record (Admin only)
exports.updateConsumption = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { consumption_liters, rate_per_liter } = req.body;

        if (!uuid || !consumption_liters) {
            return res.status(400).json({ message: 'UUID and consumption_liters are required' });
        }

        // Get current rate if not provided
        const rate = rate_per_liter || await new Promise((resolve, reject) => {
            Settings.getRatePerLiter((err, rate) => {
                if (err) reject(err);
                else resolve(rate);
            });
        });

        WaterConsumption.update(uuid, parseFloat(consumption_liters), parseFloat(rate), (err, result) => {
            if (err) {
                console.error('Error updating consumption:', err);
                return res.status(500).json({ message: 'Failed to update consumption' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Consumption record not found' });
            }

            res.status(200).json({
                message: 'Consumption record updated successfully'
            });
        });
    } catch (error) {
        console.error('Exception in updateConsumption:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete consumption record (Admin only)
exports.deleteConsumption = async (req, res) => {
    try {
        const { uuid } = req.params;

        WaterConsumption.delete(uuid, (err, result) => {
            if (err) {
                console.error('Error deleting consumption:', err);
                return res.status(500).json({ message: 'Failed to delete consumption' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Consumption record not found' });
            }

            res.status(200).json({
                message: 'Consumption record deleted successfully'
            });
        });
    } catch (error) {
        console.error('Exception in deleteConsumption:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all consumption records (Admin only). Query: q (search), page, limit (default 5, max 50). Without page/limit returns plain array.
exports.getAllConsumption = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const hasPagination = req.query.page != null || req.query.limit != null;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

        if (!hasPagination) {
            const fn = q ? (cb) => WaterConsumption.getAllSearch(q, cb) : WaterConsumption.getAll;
            return fn((err, results) => {
                if (err) {
                    console.error('Error fetching all consumption:', err);
                    return res.status(500).json({ message: 'Failed to fetch consumption records' });
                }
                res.status(200).json({ message: 'All consumption records fetched successfully', records: results.map(mapConsumptionStatus) });
            });
        }

        const onCount = (errCount, countRows) => {
            if (errCount) {
                console.error('Error counting consumption:', errCount);
                return res.status(500).json({ message: 'Failed to fetch consumption records' });
            }
            const total = countRows[0]?.total || 0;
            const fetch = q ? (cb) => WaterConsumption.getAllSearchPaginated(q, page, limit, cb) : (cb) => WaterConsumption.getAllPaginated(page, limit, cb);
            fetch((err, results) => {
                if (err) {
                    console.error('Error fetching all consumption:', err);
                    return res.status(500).json({ message: 'Failed to fetch consumption records' });
                }
                res.status(200).json({
                    message: 'All consumption records fetched successfully',
                    records: results.map(mapConsumptionStatus),
                    total,
                    page,
                    limit
                });
            });
        };
        if (q) WaterConsumption.getAllSearchCount(q, onCount);
        else WaterConsumption.getAllCount(onCount);
    } catch (error) {
        console.error('Exception in getAllConsumption:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
