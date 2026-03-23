const pool = require('../db/connection/connection');

const MONTH_ORDER_WC =
  "FIELD(wc.month, 'December','November','October','September','August','July','June','May','April','March','February','January')";
const MONTH_ORDER =
  "FIELD(month, 'December','November','October','September','August','July','June','May','April','March','February','January')";

// GET /admin/analytics/consumption-trends
exports.getConsumptionTrends = (req, res) => {
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
exports.getPaymentMethodStats = (req, res) => {
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
exports.getCollectionEfficiency = (req, res) => {
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
