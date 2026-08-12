import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import type { JwtUserPayload } from "../types/domain";
import jwt from "jsonwebtoken";
import pool from '../db/connection/connection';


const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || '24h') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'];
const maxAgeMs = (expiry) => {
  const match = (expiry || '24h').match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const [, n, unit] = match;
  const num = parseInt(n, 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return num * (multipliers[unit] || 0);
};

// Refresh access token using refresh token
export const refreshToken = async (req: AuthRequest, res: Response) => {
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

        let decoded: JwtUserPayload;
        try {
            decoded = jwt.verify(refreshToken, REFRESH_SECRET) as JwtUserPayload;
        } catch {
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
                    sameSite: 'strict',
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
export const revokeToken = async (req: AuthRequest, res: Response) => {
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
