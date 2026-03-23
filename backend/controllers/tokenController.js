const jwt = require('jsonwebtoken');
const pool = require('../db/connection/connection');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const maxAgeMs = (expiry) => {
  const match = (expiry || '24h').match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const [, n, unit] = match;
  const num = parseInt(n, 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return num * (multipliers[unit] || 0);
};

// Refresh access token using refresh token
exports.refreshToken = async (req, res) => {
    try {
        const cookieHeader = req.headers.cookie || '';
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [name, ...rest] = cookie.trim().split('=');
            acc[name] = rest.join('=');
            return acc;
        }, {});

        const refreshToken = cookies['refreshToken'];

        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY } , (err, decoded) => {
                if (err) {
                    return res.status(401).json({ message: 'Invalid or expired refresh token' });
                }
                return decoded;
            });
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        // Check if refresh token exists in database
        pool.query(
            'SELECT * FROM users WHERE uuid = ? AND refresh_token = ?',
            [decoded.uuid, refreshToken],
            (err, results) => {
                if (err) {
                    console.error('DB error:', err);
                    return res.status(500).json({ message: 'Database error' });
                }

                if (results.length === 0) {
                    return res.status(401).json({ message: 'Refresh token not found or revoked' });
                }

                const user = results[0];

                // Generate new access token (same expiry as login)
                const newAccessToken = jwt.sign(
                    { uuid: user.uuid, role: user.role, name: user.full_name },
                    JWT_SECRET,
                    { expiresIn: ACCESS_EXPIRY }
                );

                // Set new access token cookie
                res.cookie('token', newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict',
                    maxAge: maxAgeMs(ACCESS_EXPIRY)
                });

                res.status(200).json({
                    message: 'Token refreshed successfully',
                    user: {
                        uuid: user.uuid,
                        fullName: user.full_name,
                        mobileNumber: user.mobile_number,
                        role: user.role
                    }
                });
            }
        );
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Error refreshing token' });
    }
};

// Revoke refresh token (logout)
exports.revokeToken = async (req, res) => {
    try {
        const user_uuid = req.user.uuid;

        pool.query(
            'UPDATE users SET refresh_token = NULL WHERE uuid = ?',
            [user_uuid],
            (err, result) => {
                if (err) {
                    console.error('Error revoking token:', err);
                    return res.status(500).json({ message: 'Failed to revoke token' });
                }

                // Clear cookies
                res.clearCookie('token');
                res.clearCookie('refreshToken');

                res.status(200).json({ message: 'Token revoked successfully' });
            }
        );
    } catch (error) {
        console.error('Token revoke error:', error);
        res.status(500).json({ message: 'Error revoking token' });
    }
};
