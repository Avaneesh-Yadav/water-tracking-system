const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const pool = require('../db/connection/connection');
require('dotenv').config();

function getPaymentStatusForUser(user_uuid, callback) {
    pool.query(
        `SELECT COALESCE(SUM(CASE WHEN payment_status = 'UNPAID' THEN amount ELSE 0 END), 0) AS due_amount
         FROM water_consumption WHERE user_uuid = ?`,
        [user_uuid],
        (err, rows) => {
            if (err) return callback(err);
            const due = rows && rows[0] ? parseFloat(rows[0].due_amount) || 0 : 0;
            callback(null, due > 0 ? 'PENDING' : 'COMPLETED');
        }
    );
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
// Access token lifetime (e.g. 24h, 7d). Longer = fewer refreshes; keep refresh token secure.
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const maxAgeMs = (expiry) => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const [, n, unit] = match;
  const num = parseInt(n, 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return num * (multipliers[unit] || 0);
};

exports.loginUser = async (req, res) => {
  const { mobileNumber, password } = req.body;
  if (!mobileNumber || !password) {
    return res.status(400).json({ message: 'Mobile number and password are required.' });
  }

  try {
    User.getByPhone(mobileNumber, async (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ message: 'Database error.' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'User not found.' });
      }

      const user = results[0];
      console.log("User" ,user.status);
      
       if(user.status == 'REVOKE'){
        return res.status(400).json({ message: 'Your account has been revoked. Please contact the administrator.' });
       }
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      // Generate access token (configurable, default 24h)
      const accessToken = jwt.sign(
        { uuid: user.uuid, role: user.role, name: user.full_name },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRY }
      );

      // Generate refresh token (configurable, default 7d)
      const refreshToken = jwt.sign(
        { uuid: user.uuid, role: user.role },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRY }
      );

      // Store refresh token in database
      pool.query(
        'UPDATE users SET refresh_token = ? WHERE uuid = ?',
        [refreshToken, user.uuid],
        (updateErr) => {
          if (updateErr) {
            console.error('Error storing refresh token:', updateErr);
          }
        }
      );

      // Payment status derived from water_consumption (any UNPAID => PENDING)
      getPaymentStatusForUser(user.uuid, (statusErr, paymentStatus) => {
        if (statusErr) paymentStatus = 'COMPLETED';

        res.cookie('token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: maxAgeMs(ACCESS_EXPIRY)
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: maxAgeMs(REFRESH_EXPIRY)
        });

        res.status(200).json({
          message: 'Login successful.',
          user: {
            fullName: user.full_name,
            uuid: user.uuid,
            mobileNumber: user.mobile_number,
            role: user.role,
            address: user.address,
            connectionId: user.connection_id,
            status: user.status,
            paymentStatus
          },
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error logging in.' });
  }
};

