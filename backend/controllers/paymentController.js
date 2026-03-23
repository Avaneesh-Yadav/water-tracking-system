const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const WaterConsumption = require('../models/WaterConsumption');
const Settings = require('../models/Settings');

// Record a payment. Use consumption_uuid (single bill) or consumption_uuids (array for "pay total due").
// When consumption_uuids is sent, all those unpaid consumptions are marked PAID so due amount updates.
exports.recordPayment = async (req, res) => {
    try {
        const { consumption_uuid, consumption_uuids, amount, payment_method, transaction_id, upi_id } = req.body;
        const user_uuid = req.user.uuid;

        if (!amount || !payment_method) {
            return res.status(400).json({ message: 'Amount and payment method are required' });
        }

        // Check if transaction ID already exists (prevent duplicates)
        if (transaction_id) {
            const existingPayment = await new Promise((resolve, reject) => {
                Payment.getByTransactionId(transaction_id, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (existingPayment.length > 0) {
                return res.status(409).json({ message: 'Transaction ID already exists' });
            }
        }

        const uuid = uuidv4();
        const amountNum = parseFloat(amount);

        // Pay total due: multiple consumptions marked PAID, one payment record
        const uuidsToMarkPaid = Array.isArray(consumption_uuids) && consumption_uuids.length > 0
            ? consumption_uuids
            : consumption_uuid ? [consumption_uuid] : [];

        if (uuidsToMarkPaid.length > 0) {
            // Validate all consumptions exist, belong to user, and are UNPAID
            const unpaid = await new Promise((resolve, reject) => {
                WaterConsumption.getUnpaidByUserUuid(user_uuid, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            const unpaidUuids = new Set((unpaid || []).map((r) => r.uuid));
            const invalid = uuidsToMarkPaid.filter((id) => !unpaidUuids.has(id));
            if (invalid.length > 0) {
                return res.status(400).json({
                    message: 'Some consumption records are not unpaid or do not belong to you.',
                    invalid
                });
            }
        }

        Payment.create(
            uuid,
            user_uuid,
            uuidsToMarkPaid.length === 1 ? uuidsToMarkPaid[0] : null,
            amountNum,
            payment_method,
            transaction_id || null,
            upi_id || null,
            (err, result) => {
                if (err) {
                    console.error('Error recording payment:', err);
                    return res.status(500).json({
                        message: 'Failed to record payment',
                        error: err.message
                    });
                }

                // Mark linked consumption(s) as PAID so due amount goes down
                if (uuidsToMarkPaid.length === 1) {
                    WaterConsumption.updateStatus(uuidsToMarkPaid[0], 'PAID', (err) => {
                        if (err) console.error('Error updating consumption status:', err);
                    });
                } else if (uuidsToMarkPaid.length > 1) {
                    WaterConsumption.updateStatusBulk(user_uuid, uuidsToMarkPaid, 'PAID', (err) => {
                        if (err) console.error('Error updating consumption status (bulk):', err);
                    });
                }

                res.status(201).json({
                    message: 'Payment recorded successfully',
                    payment: {
                        uuid,
                        user_uuid,
                        consumption_uuid: uuidsToMarkPaid.length === 1 ? uuidsToMarkPaid[0] : null,
                        consumption_uuids: uuidsToMarkPaid.length > 1 ? uuidsToMarkPaid : undefined,
                        amount: amountNum,
                        payment_method,
                        transaction_id,
                        upi_id
                    }
                });
            }
        );
    } catch (error) {
        console.error('Exception in recordPayment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get payment history for logged-in user (supports ?page=1&limit=10 and ?q= for search)
exports.getPaymentHistory = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;
        const q = (req.query.q || '').trim();

        if (q) {
            Payment.getByUserUuidSearch(user_uuid, q, (err, results) => {
                if (err) {
                    console.error('Error fetching payment history:', err);
                    return res.status(500).json({ message: 'Failed to fetch payment history' });
                }
                res.status(200).json({ message: 'Payment history fetched successfully', history: results });
            });
            return;
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

        Payment.getByUserUuidCount(user_uuid, (errCount, countRows) => {
            if (errCount) {
                console.error('Error counting payments:', errCount);
                return res.status(500).json({ message: 'Failed to fetch payment history' });
            }
            const total = countRows[0]?.total || 0;
            Payment.getByUserUuidPaginated(user_uuid, page, limit, (err, results) => {
                if (err) {
                    console.error('Error fetching payment history:', err);
                    return res.status(500).json({ message: 'Failed to fetch payment history' });
                }
                res.status(200).json({
                    message: 'Payment history fetched successfully',
                    history: results,
                    total,
                    page,
                    limit
                });
            });
        });
    } catch (error) {
        console.error('Exception in getPaymentHistory:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get payment history for specific user (Admin)
exports.getPaymentHistoryByUser = async (req, res) => {
    try {
        const { user_uuid } = req.params;

        if (!user_uuid) {
            return res.status(400).json({ message: 'User UUID is required' });
        }

        Payment.getByUserUuid(user_uuid, (err, results) => {
            if (err) {
                console.error('Error fetching payment history:', err);
                return res.status(500).json({ message: 'Failed to fetch payment history' });
            }

            res.status(200).json({
                message: 'Payment history fetched successfully',
                history: results
            });
        });
    } catch (error) {
        console.error('Exception in getPaymentHistoryByUser:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate UPI QR data for payment. Amount is sent to the admin-configured UPI ID
// (app_settings: upi_id, payee_name). Users scan QR with any UPI app; payment goes
// directly to the admin account. User then marks payment in app to link it to their bill.
exports.generatePaymentQR = async (req, res) => {
    try {
        const { consumption_uuid } = req.params;
        const { amount: customAmount } = req.query;

        let amount = customAmount;
        let billInfo = null;

        // If consumption_uuid provided, get amount from that record
        if (consumption_uuid && consumption_uuid !== 'due') {
            const consumption = await new Promise((resolve, reject) => {
                WaterConsumption.getByUuid(consumption_uuid, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (consumption.length === 0) {
                return res.status(404).json({ message: 'Consumption record not found' });
            }

            amount = consumption[0].amount;
            billInfo = {
                month: consumption[0].month,
                year: consumption[0].year,
                consumption_liters: consumption[0].consumption_liters
            };
        }

        // If 'due' is passed, calculate total due
        if (consumption_uuid === 'due') {
            const user_uuid = req.user.uuid;
            const dueResult = await new Promise((resolve, reject) => {
                WaterConsumption.getDueAmount(user_uuid, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            amount = dueResult[0]?.due_amount || 0;
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'No amount to pay' });
        }

        // Get UPI settings
        const upiId = await new Promise((resolve, reject) => {
            Settings.getUpiId((err, id) => {
                if (err) reject(err);
                else resolve(id);
            });
        });

        const payeeName = await new Promise((resolve, reject) => {
            Settings.getPayeeName((err, name) => {
                if (err) reject(err);
                else resolve(name);
            });
        });

        if (!upiId) {
            return res.status(400).json({
                message: 'UPI ID not configured. Please contact administrator.'
            });
        }

        // Generate UPI URL (works with PhonePe, Paytm, GPay, etc.)
        const transactionNote = billInfo
            ? `Water Bill - ${billInfo.month} ${billInfo.year}`
            : `Water Bill Payment`;

        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

        res.status(200).json({
            message: 'QR data generated successfully',
            qr_data: {
                upi_url: upiUrl,
                upi_id: upiId,
                payee_name: payeeName,
                amount: parseFloat(amount),
                currency: 'INR',
                note: transactionNote,
                bill_info: billInfo
            }
        });
    } catch (error) {
        console.error('Exception in generatePaymentQR:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all payments (Admin only). Query: q (search), page, limit (default 5, max 50). Without page/limit returns plain array.
exports.getAllPayments = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const hasPagination = req.query.page != null || req.query.limit != null;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

        if (!hasPagination) {
            const fn = q ? (cb) => Payment.getAllSearch(q, cb) : Payment.getAll;
            return fn((err, results) => {
                if (err) {
                    console.error('Error fetching all payments:', err);
                    return res.status(500).json({ message: 'Failed to fetch payments' });
                }
                res.status(200).json({ message: 'All payments fetched successfully', payments: results });
            });
        }

        const onCount = (errCount, countRows) => {
            if (errCount) {
                console.error('Error counting payments:', errCount);
                return res.status(500).json({ message: 'Failed to fetch payments' });
            }
            const total = countRows[0]?.total || 0;
            const fetch = q ? (cb) => Payment.getAllSearchPaginated(q, page, limit, cb) : (cb) => Payment.getAllPaginated(page, limit, cb);
            fetch((err, results) => {
                if (err) {
                    console.error('Error fetching all payments:', err);
                    return res.status(500).json({ message: 'Failed to fetch payments' });
                }
                res.status(200).json({
                    message: 'All payments fetched successfully',
                    payments: results,
                    total,
                    page,
                    limit
                });
            });
        };
        if (q) Payment.getAllSearchCount(q, onCount);
        else Payment.getAllCount(onCount);
    } catch (error) {
        console.error('Exception in getAllPayments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get total paid by user
exports.getTotalPaid = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;

        Payment.getTotalPaidByUser(user_uuid, (err, results) => {
            if (err) {
                console.error('Error fetching total paid:', err);
                return res.status(500).json({ message: 'Failed to fetch total paid' });
            }

            res.status(200).json({
                message: 'Total paid fetched successfully',
                total_paid: results[0]?.total_paid || 0
            });
        });
    } catch (error) {
        console.error('Exception in getTotalPaid:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
