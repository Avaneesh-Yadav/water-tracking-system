import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import pool from '../db/connection/connection';

const MONTH_ORDER_WC =
  "FIELD(wc.month, 'December','November','October','September','August','July','June','May','April','March','February','January')";
const MONTH_ORDER =
  "FIELD(month, 'December','November','October','September','August','July','June','May','April','March','February','January')";

// GET /admin/analytics/consumption-trends
export const getConsumptionTrends = (req: AuthRequest, res: Response) => {
  pool.query(
    `SELECT wc.year, wc.month,
            COALESCE(SUM(wc.consumption_liters), 0) AS liters,
            COALESCE(SUM(wc.amount), 0) AS amount,
            COUNT(DISTINCT wc.user_uuid) AS connections
     FROM water_consumption wc
     GROUP BY wc.year, wc.month
     ORDER BY wc.year DESC, ${MONTH_ORDER_WC} DESC
     LIMIT 24`,
    (err, rows) => {
      if (err) {
        console.error('consumption-trends error:', err);
        return res.status(500).json({ message: 'Failed to load trends' });
      }
      const trends = (rows || []).map((r) => ({
        period: `${String(r.month || '').slice(0, 3)} ${r.year}`,
        year: r.year,
        month: r.month,
        liters: parseFloat(r.liters) || 0,
        amount: parseFloat(r.amount) || 0,
        connections: parseInt(r.connections, 10) || 0,
      }));
      res.json({ trends });
    }
  );
};

// GET /admin/analytics/payment-methods
export const getPaymentMethodStats = (req: AuthRequest, res: Response) => {
  pool.query(
    `SELECT COALESCE(NULLIF(TRIM(payment_method), ''), 'Other') AS method,
            COUNT(*) AS cnt,
            COALESCE(SUM(amount), 0) AS total
     FROM payments
     GROUP BY COALESCE(NULLIF(TRIM(payment_method), ''), 'Other')
     ORDER BY total DESC`,
    (err, rows) => {
      if (err) {
        console.error('payment-methods error:', err);
        return res.status(500).json({ message: 'Failed to load payment stats' });
      }
      const byMethod = (rows || []).map((r) => ({
        method: r.method,
        count: parseInt(r.cnt, 10) || 0,
        total: parseFloat(r.total) || 0,
      }));
      res.json({ byMethod });
    }
  );
};

// GET /admin/analytics/collection-efficiency
export const getCollectionEfficiency = (req: AuthRequest, res: Response) => {
  pool.query(
    `SELECT year, month,
            COALESCE(SUM(amount), 0) AS billed,
            COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS collected
     FROM water_consumption
     GROUP BY year, month
     ORDER BY year DESC, ${MONTH_ORDER} DESC
     LIMIT 24`,
    (err, rows) => {
      if (err) {
        console.error('collection-efficiency error:', err);
        return res.status(500).json({ message: 'Failed to load efficiency' });
      }
      const byMonth = (rows || []).map((r) => {
        const billed = parseFloat(r.billed) || 0;
        const collected = parseFloat(r.collected) || 0;
        const efficiency = billed > 0 ? Math.round((collected / billed) * 1000) / 10 : 0;
        return {
          period: `${String(r.month || '').slice(0, 3)} ${r.year}`,
          year: r.year,
          month: r.month,
          billed,
          collected,
          efficiency,
        };
      });
      res.json({ byMonth });
    }
  );
};

// GET /admin/analytics/kpis — dashboard headline metrics
export const getKPIs = (req: AuthRequest, res: Response) => {
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      pool.query(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

  Promise.all([
    run(`SELECT COUNT(*) AS c FROM users WHERE UPPER(role) = 'USER' AND status = 'ACTIVE'`),
    run(`SELECT COALESCE(SUM(amount), 0) AS s FROM water_consumption WHERE payment_status = 'UNPAID'`),
    run(`SELECT COUNT(*) AS c FROM water_consumption WHERE payment_status = 'UNPAID'`),
    run(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM payments
       WHERE YEAR(paid_at) = YEAR(CURDATE()) AND MONTH(paid_at) = MONTH(CURDATE())`
    ),
    run(
      `SELECT COUNT(*) AS c FROM payments
       WHERE YEAR(paid_at) = YEAR(CURDATE()) AND MONTH(paid_at) = MONTH(CURDATE())`
    ),
    run(`SELECT COALESCE(SUM(consumption_liters), 0) AS l FROM water_consumption`),
    run(`SELECT COUNT(*) AS c FROM water_consumption`),
  ])
    .then(([activeUsers, outstanding, unpaidBills, collMonth, payCountMonth, totalLiters, totalReads]) => {
      res.json({
        active_consumers: parseInt(activeUsers[0]?.c, 10) || 0,
        total_outstanding: parseFloat(outstanding[0]?.s) || 0,
        unpaid_bill_count: parseInt(unpaidBills[0]?.c, 10) || 0,
        collected_this_month: parseFloat(collMonth[0]?.s) || 0,
        payment_count_this_month: parseInt(payCountMonth[0]?.c, 10) || 0,
        total_consumption_liters_recorded: parseFloat(totalLiters[0]?.l) || 0,
        total_consumption_records: parseInt(totalReads[0]?.c, 10) || 0,
      });
    })
    .catch((e) => {
      console.error('getKPIs:', e);
      res.status(500).json({ message: 'Failed to load KPIs' });
    });
};
