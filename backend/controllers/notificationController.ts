import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import type { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification';
import Payment from '../models/Payment';
import WaterConsumption from '../models/WaterConsumption';

const PAYMENT_RELATED_TO = 'PAYMENT';

const parseNotificationPayload = (text) => {
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
};

const annotatePaidStatus = (notifications, callback) => {
    const groupedByUser = new Map(); // user_uuid -> Set(consumption_uuid)

    const normalized = notifications.map((n) => {
        const details = parseNotificationPayload(n.notification_details);
        const consumptionUuid = Array.isArray(details?.consumption_uuids) && details.consumption_uuids.length > 0
            ? details.consumption_uuids[0]
            : details?.consumption_uuid || null;
        return { n, details, consumptionUuid };
    });

    normalized.forEach(({ n, consumptionUuid }) => {
        const u = n.user_id;
        if (!groupedByUser.has(u)) groupedByUser.set(u, new Set());
        if (consumptionUuid) groupedByUser.get(u).add(consumptionUuid);
    });

    const userKeys = Array.from(groupedByUser.keys());
    const resultsByUser = new Map(); // user_uuid -> Set(paidConsumptionUuids)

    let remaining = userKeys.length;
    if (remaining === 0) {
        return callback(null, normalized.map(({ n }) => n));
    }

    userKeys.forEach((user_uuid) => {
        const uuids = Array.from(groupedByUser.get(user_uuid) || []);
        WaterConsumption.getPaymentStatusByUuidsForUser(user_uuid, uuids, (err, rows) => {
            if (err) {
                // If status fetch fails, fall back to is_paid=false.
                resultsByUser.set(user_uuid, new Set());
            } else {
                const paidSet = new Set((rows || []).filter((r) => r.payment_status === 'PAID').map((r) => r.uuid));
                resultsByUser.set(user_uuid, paidSet);
            }
            remaining -= 1;
            if (remaining === 0) {
                const annotated = normalized.map(({ n, details, consumptionUuid }) => {
                    const paidSet = resultsByUser.get(n.user_id) || new Set();
                    const is_paid = consumptionUuid ? paidSet.has(consumptionUuid) : false;
                    return { ...n, details, is_paid };
                });
                callback(null, annotated);
            }
        });
    });
};

export const createPaymentNotification = async (req: AuthRequest, res: Response) => {
    try {
        const user_uuid = req.user.uuid;
        const { consumption_uuid, consumption_uuids, amount, payment_method, upi_id, message } = req.body;

        if (!amount || !payment_method) {
            return res.status(400).json({ message: 'Amount and payment method are required' });
        }

        const linkedConsumptions = Array.isArray(consumption_uuids) && consumption_uuids.length > 0
            ? consumption_uuids
            : (consumption_uuid ? [consumption_uuid] : []);

        if (linkedConsumptions.length === 0) {
            return res.status(400).json({ message: 'At least one consumption record is required' });
        }

        const totalAmount = parseFloat(amount);
        const paymentMethod = payment_method || 'UPI';
        const upiId = upi_id || null;
        const msg = message || null;

        // When paying total due, split into one notification per consumption UUID
        // so admin marks bills individually instead of paying everything at once.
        const createOne = async (consumptionId, perAmount) => {
            const payload = {
                amount: Number(perAmount) || 0,
                payment_method: paymentMethod,
                upi_id: upiId,
                message: msg,
                consumption_uuid: consumptionId,
                consumption_uuids: [consumptionId],
                created_by: user_uuid
            };
            return new Promise((resolve, reject) => {
                Notification.create(
                    uuidv4(),
                    user_uuid,
                    JSON.stringify(payload),
                    PAYMENT_RELATED_TO,
                    (err) => (err ? reject(err) : resolve(true))
                );
            });
        };

        if (linkedConsumptions.length === 1) {
            await createOne(linkedConsumptions[0], totalAmount);
            return res.status(201).json({ message: 'Payment notification submitted successfully' });
        }

        const amountsRows = await new Promise<RowDataPacket[]>((resolve, reject) => {
            WaterConsumption.getAmountsByUuidsForUser(user_uuid, linkedConsumptions, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const amountByUuid = new Map((amountsRows || []).map((r) => [r.uuid, r.amount]));

        // Fallback: if any missing amounts, distribute based on total/remaining to avoid hard failure.
        const missing = linkedConsumptions.filter((id) => !amountByUuid.has(id));
        if (missing.length > 0) {
            const perFallback = totalAmount / Math.max(1, linkedConsumptions.length);
            missing.forEach((id) => amountByUuid.set(id, perFallback));
        }

        for (const id of linkedConsumptions) {
            await createOne(id, amountByUuid.get(id));
        }

        return res.status(201).json({ message: 'Payment notifications submitted successfully' });
    } catch (error) {
        console.error('Exception in createPaymentNotification:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getMyNotifications = (req: AuthRequest, res: Response) => {
    Notification.getByUserId(req.user.uuid, (err, rows) => {
        if (err) {
            console.error('Error fetching user notifications:', err);
            return res.status(500).json({ message: 'Failed to fetch notifications' });
        }
        const list = rows || [];
        annotatePaidStatus(list, (_aErr, annotated) => {
            const notifications = annotated.map((n) => ({ ...n, details: n.details ?? parseNotificationPayload(n.notification_details) }));
            return res.status(200).json({ notifications });
        });
    });
};

export const getAllNotificationsAdmin = (_req, res) => {
    Notification.getAllWithUsers((err, rows) => {
        if (err) {
            console.error('Error fetching admin notifications:', err);
            return res.status(500).json({ message: 'Failed to fetch notifications' });
        }
        annotatePaidStatus(rows || [], (_aErr, annotated) => {
            const notifications = (annotated || []).map((n) => ({ ...n, details: n.details ?? parseNotificationPayload(n.notification_details) }));
            return res.status(200).json({ notifications });
        });
    });
};

export const getPaymentNotificationsByUserAdmin = (req: AuthRequest, res: Response) => {
    const { user_uuid } = req.params;
    if (!user_uuid) return res.status(400).json({ message: 'User UUID is required' });

    Notification.getPaymentNotificationsByUserId(user_uuid, PAYMENT_RELATED_TO, (err, rows) => {
        if (err) {
            console.error('Error fetching admin payment notifications for user:', err);
            return res.status(500).json({ message: 'Failed to fetch notifications' });
        }
        annotatePaidStatus(rows || [], (_aErr, annotated) => {
            const notifications = (annotated || []).map((n) => ({ ...n, details: n.details ?? parseNotificationPayload(n.notification_details) }));
            return res.status(200).json({ notifications });
        });
    });
};

export const getUnreadPaymentNotificationCountByUserAdmin = (req: AuthRequest, res: Response) => {
    const { user_uuid } = req.params;
    if (!user_uuid) return res.status(400).json({ message: 'User UUID is required' });

    Notification.getUnreadCountByUserId(user_uuid, PAYMENT_RELATED_TO, (err, rows) => {
        if (err) {
            console.error('Error fetching unread payment notification count for user:', err);
            return res.status(500).json({ message: 'Failed to fetch unread notification count' });
        }
        return res.status(200).json({ total: rows?.[0]?.total || 0 });
    });
};

export const getUnreadCountAdmin = (_req, res) => {
    Notification.getUnreadCount((err, rows) => {
        if (err) {
            console.error('Error fetching unread notification count:', err);
            return res.status(500).json({ message: 'Failed to fetch unread notification count' });
        }
        return res.status(200).json({ total: rows?.[0]?.total || 0 });
    });
};

export const markAllPaymentNotificationsReadAdmin = (_req, res) => {
    Notification.markAllPaymentRead((err) => {
        if (err) {
            console.error('Error marking all payment notifications read:', err);
            return res.status(500).json({ message: 'Failed to mark notifications as read' });
        }
        return res.status(200).json({ message: 'All payment notifications marked as read' });
    });
};

export const markAllPaymentNotificationsReadByUserAdmin = (req: AuthRequest, res: Response) => {
    const { user_uuid } = req.params;
    if (!user_uuid) return res.status(400).json({ message: 'User UUID is required' });

    Notification.markAllPaymentReadByUser(user_uuid, (err) => {
        if (err) {
            console.error('Error marking payment notifications read by user:', err);
            return res.status(500).json({ message: 'Failed to mark notifications as read' });
        }
        return res.status(200).json({ message: 'User payment notifications marked as read' });
    });
};

export const markNotificationReadAdmin = (req: AuthRequest, res: Response) => {
    const { uuid } = req.params;
    Notification.markRead(uuid, (err) => {
        if (err) {
            console.error('Error marking notification read:', err);
            return res.status(500).json({ message: 'Failed to update notification' });
        }
        return res.status(200).json({ message: 'Notification marked as read' });
    });
};

export const approvePaymentNotificationAdmin = (req: AuthRequest, res: Response) => {
    const { uuid } = req.params;
    Notification.getByUuid(uuid, (findErr, rows) => {
        if (findErr) {
            console.error('Error finding notification:', findErr);
            return res.status(500).json({ message: 'Failed to process notification' });
        }
        const notification = rows?.[0];
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const details = parseNotificationPayload(notification.notification_details);
        if (!details || !Array.isArray(details.consumption_uuids) || details.consumption_uuids.length === 0) {
            return res.status(400).json({ message: 'Invalid notification details' });
        }

        const user_uuid = notification.user_id;
        const consumptionUuids = details.consumption_uuids;
        const amount = parseFloat(details.amount) || 0;
        const transactionRef = details.message || null;

        const complete = () => Notification.markRead(uuid, (markErr) => {
            if (markErr) {
                console.error('Error marking notification read after approval:', markErr);
            }
            return res.status(200).json({ message: 'Payment approved and marked paid' });
        });

        const createPayment = (uuidsToPay) => {
            Payment.create(
                uuidv4(),
                user_uuid,
                uuidsToPay && uuidsToPay.length === 1 ? uuidsToPay[0] : null,
                amount,
                details.payment_method || 'UPI',
                transactionRef,
                details.upi_id || null,
                (paymentErr) => {
                    if (paymentErr) {
                        console.error('Error creating payment on approval:', paymentErr);
                        return res.status(500).json({ message: 'Failed to create payment entry' });
                    }
                    return complete();
                }
            );
        };

        const finalizeWithPaymentCreate = (uuidsToPay) => createPayment(uuidsToPay);

        // Idempotency: only approve if the requested consumption(s) are still UNPAID.
        return WaterConsumption.getUnpaidByUserUuid(user_uuid, (unpaidErr, unpaidRows) => {
            if (unpaidErr) {
                console.error('Error validating unpaid consumptions:', unpaidErr);
                return res.status(500).json({ message: 'Failed to validate payment status' });
            }
            const unpaidSet = new Set((unpaidRows || []).map((r) => r.uuid));
            const stillUnpaid = consumptionUuids.filter((id) => unpaidSet.has(id));

            // If everything is already paid, just mark notification as read.
            if (stillUnpaid.length === 0) {
                return Notification.markRead(uuid, () => res.status(200).json({ message: 'Already paid; notification marked read' }));
            }

            if (stillUnpaid.length === 1) {
                return WaterConsumption.updateStatus(stillUnpaid[0], 'PAID', (statusErr) => {
                    if (statusErr) {
                        console.error('Error updating consumption status:', statusErr);
                        return res.status(500).json({ message: 'Failed to update consumption status' });
                    }
                    return finalizeWithPaymentCreate(stillUnpaid);
                });
            }

            return WaterConsumption.updateStatusBulk(user_uuid, stillUnpaid, 'PAID', (bulkErr) => {
                if (bulkErr) {
                    console.error('Error updating consumption status (bulk):', bulkErr);
                    return res.status(500).json({ message: 'Failed to update consumption status' });
                }
                return finalizeWithPaymentCreate(stillUnpaid);
            });
        });
    });
};
