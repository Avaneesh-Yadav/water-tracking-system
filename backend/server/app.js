/**
 * Express application setup.
 * Configures middleware and mounts API routes.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const userRoutes = require('../routes/userRoutes');

const app = express();
const allowedOrigin = process.env.WEB_URL?.replace(/\/$/, '');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const meterDir = path.join(uploadsRoot, 'meter');
try {
  fs.mkdirSync(meterDir, { recursive: true });
} catch (_) {
  /* ignore */
}

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/uploads', express.static(uploadsRoot));

// API routes
app.use('/api', userRoutes);

// Optional: health check for load balancers / monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
