import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import XLSX from 'xlsx';
import pool from '../db/connection/connection';

/**
 * GET /admin/export/consumers — Excel download of all consumers with outstanding balance.
 */
export const exportConsumers = (req: AuthRequest, res: Response) => {
    pool.query(
        `SELECT u.uuid, u.full_name, u.mobile_number, u.connection_id, u.address, u.status, u.role, u.created_at,
                (SELECT COALESCE(SUM(wc.amount), 0) FROM water_consumption wc
                 WHERE wc.user_uuid = u.uuid AND wc.payment_status = 'UNPAID') AS outstanding_due
         FROM users u
         WHERE UPPER(u.role) = 'USER'
         ORDER BY u.full_name ASC`,
        (err, rows) => {
            if (err) {
                console.error('exportConsumers:', err);
                return res.status(500).json({ message: 'Failed to export consumers' });
            }
            const data = (rows || []).map((r) => ({
                'Full name': r.full_name,
                Mobile: r.mobile_number,
                'Connection ID': r.connection_id,
                Address: r.address || '',
                Status: r.status,
                'Outstanding due (₹)': parseFloat(r.outstanding_due) || 0,
                Registered: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
            }));
            const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Full name': '', Mobile: '' }]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Consumers');
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            const fname = `consumers-${new Date().toISOString().slice(0, 10)}.xlsx`;
            res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buf);
        }
    );
};
