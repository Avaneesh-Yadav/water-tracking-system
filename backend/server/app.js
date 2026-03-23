/**
 * Express application setup.
 * Configures middleware and mounts API routes.
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const userRoutes = require('../routes/userRoutes');

const app = express();
const allowedOrigin = process.env.WEB_URL?.replace(/\/$/, '');

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API routes
app.use('/api', userRoutes);

// Optional: health check for load balancers / monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
