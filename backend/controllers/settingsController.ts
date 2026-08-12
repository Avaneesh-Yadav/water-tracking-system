import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import Settings from '../models/Settings';

// Get all settings (Admin only)
export const getAllSettings = async (req: AuthRequest, res: Response) => {
    try {
        Settings.getAll((err, results) => {
            if (err) {
                console.error('Error fetching settings:', err);
                return res.status(500).json({ message: 'Failed to fetch settings' });
            }

            // Convert to key-value object
            const settings = {};
            results.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });

            res.status(200).json({
                message: 'Settings fetched successfully',
                settings
            });
        });
    } catch (error) {
        console.error('Exception in getAllSettings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a setting (Admin only)
export const updateSetting = async (req: AuthRequest, res: Response) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ message: 'Key and value are required' });
        }

        Settings.set(key, value, (err, result) => {
            if (err) {
                console.error('Error updating setting:', err);
                return res.status(500).json({ message: 'Failed to update setting' });
            }

            res.status(200).json({
                message: 'Setting updated successfully',
                setting: { key, value }
            });
        });
    } catch (error) {
        console.error('Exception in updateSetting:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get rate per liter
export const getRatePerLiter = async (req: AuthRequest, res: Response) => {
    try {
        Settings.getRatePerLiter((err, rate) => {
            if (err) {
                console.error('Error fetching rate:', err);
                return res.status(500).json({ message: 'Failed to fetch rate' });
            }

            res.status(200).json({
                message: 'Rate fetched successfully',
                rate_per_liter: rate
            });
        });
    } catch (error) {
        console.error('Exception in getRatePerLiter:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update rate per liter (Admin only)
export const updateRatePerLiter = async (req: AuthRequest, res: Response) => {
    try {
        const { rate } = req.body;

        if (rate === undefined || rate <= 0) {
            return res.status(400).json({ message: 'Valid rate is required' });
        }

        Settings.setRatePerLiter(parseFloat(rate), (err, result) => {
            if (err) {
                console.error('Error updating rate:', err);
                return res.status(500).json({ message: 'Failed to update rate' });
            }

            res.status(200).json({
                message: 'Rate per liter updated successfully',
                rate_per_liter: parseFloat(rate)
            });
        });
    } catch (error) {
        console.error('Exception in updateRatePerLiter:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get UPI settings
export const getUpiSettings = async (req: AuthRequest, res: Response) => {
    try {
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

        res.status(200).json({
            message: 'UPI settings fetched successfully',
            upi_id: upiId,
            payee_name: payeeName
        });
    } catch (error) {
        console.error('Exception in getUpiSettings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update UPI settings (Admin only)
export const updateUpiSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { upi_id, payee_name } = req.body;

        if (!upi_id) {
            return res.status(400).json({ message: 'UPI ID is required' });
        }

        await new Promise((resolve, reject) => {
            Settings.setUpiId(upi_id, (err) => {
                if (err) reject(err);
                else resolve(undefined as void);
            });
        });

        if (payee_name) {
            await new Promise((resolve, reject) => {
                Settings.setPayeeName(payee_name, (err) => {
                    if (err) reject(err);
                    else resolve(undefined as void);
                });
            });
        }

        res.status(200).json({
            message: 'UPI settings updated successfully',
            upi_id,
            payee_name: payee_name || 'Water Supply'
        });
    } catch (error) {
        console.error('Exception in updateUpiSettings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get branding/organization settings (public - for bills, footer, app name)
export const getBrandingSettings = async (req: AuthRequest, res: Response) => {
    try {
        const [organization_name, support_email, support_phone, currency_display, unit_label, bill_due_day] = await Promise.all([
            new Promise((resolve, reject) => Settings.getOrganizationName((err, v) => err ? reject(err) : resolve(v))),
            new Promise((resolve, reject) => Settings.getSupportEmail((err, v) => err ? reject(err) : resolve(v))),
            new Promise((resolve, reject) => Settings.getSupportPhone((err, v) => err ? reject(err) : resolve(v))),
            new Promise((resolve, reject) => Settings.getCurrencyDisplay((err, v) => err ? reject(err) : resolve(v))),
            new Promise((resolve, reject) => Settings.getUnitLabel((err, v) => err ? reject(err) : resolve(v))),
            new Promise((resolve, reject) => Settings.getBillDueDay((err, v) => err ? reject(err) : resolve(v)))
        ]);

        res.status(200).json({
            message: 'Branding settings fetched successfully',
            organization_name,
            support_email,
            support_phone,
            currency_display,
            unit_label,
            bill_due_day
        });
    } catch (error) {
        console.error('Exception in getBrandingSettings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update branding settings (Admin only)
export const updateBrandingSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { organization_name, support_email, support_phone, bill_due_day, currency_display, unit_label } = req.body;

        const updates = [];
        if (organization_name !== undefined) updates.push(cb => Settings.setOrganizationName(organization_name, cb));
        if (support_email !== undefined) updates.push(cb => Settings.setSupportEmail(support_email, cb));
        if (support_phone !== undefined) updates.push(cb => Settings.setSupportPhone(support_phone, cb));
        if (bill_due_day !== undefined) updates.push(cb => Settings.setBillDueDay(bill_due_day, cb));
        if (currency_display !== undefined) updates.push(cb => Settings.setCurrencyDisplay(currency_display, cb));
        if (unit_label !== undefined) updates.push(cb => Settings.setUnitLabel(unit_label, cb));

        for (const update of updates) {
            await new Promise<void>((resolve, reject) => update((err) => (err ? reject(err) : resolve())));
        }

        res.status(200).json({
            message: 'Branding settings updated successfully',
            organization_name,
            support_email,
            support_phone,
            bill_due_day,
            currency_display,
            unit_label
        });
    } catch (error) {
        console.error('Exception in updateBrandingSettings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
