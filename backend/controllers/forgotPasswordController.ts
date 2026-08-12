import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import PasswordResetOtp from '../models/PasswordResetOtp';
import smsService from '../smsService';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 15;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;

import type { UserRow } from "../types/domain";
import type { RowDataPacket } from "mysql2";

function promisify<T>(fn: (...args: [...unknown[], (err: Error | null, result?: T) => void]) => void, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function expiresInLabel() {
  return OTP_EXPIRY_MINUTES === 1 ? '1 minute' : `${OTP_EXPIRY_MINUTES} minutes`;
}

function buildOtpResponse(resetToken: string, extra: Record<string, unknown> = {}) {
  const response: Record<string, unknown> = {
    message: 'Reset OTP sent successfully to your mobile number',
    expiresIn: expiresInLabel(),
    maxAttempts: OTP_MAX_ATTEMPTS,
    ...extra,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.otp = resetToken;
    response.note = 'OTP included in response only in development mode';
  }

  return response;
}

// Generate reset token and send via SMS
export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    const userRows = await promisify<UserRow[]>(User.getByPhone.bind(User), mobileNumber);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found with this mobile number' });
    }

    const user = userRows[0];
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await promisify(
      PasswordResetOtp.upsert.bind(PasswordResetOtp),
      mobileNumber,
      user.uuid,
      resetToken,
      expiresAt,
      OTP_MAX_ATTEMPTS
    );

    try {
      await smsService.sendOTP(mobileNumber, resetToken);
      console.log(`✅ OTP sent to ${mobileNumber}`);
      return res.status(200).json(buildOtpResponse(resetToken));
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError.message);

      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json(
          buildOtpResponse(resetToken, {
            message: 'SMS service unavailable, but OTP generated',
            warning: 'SMS sending failed - Development mode only',
          })
        );
      }

      await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);
      return res.status(500).json({
        message: 'Failed to send OTP. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify OTP
export const verifyOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required' });
    }

    const rows = await promisify(PasswordResetOtp.getByMobile.bind(PasswordResetOtp), mobileNumber);
    const tokenData = rows[0];

    if (!tokenData) {
      return res.status(400).json({ message: 'No reset request found for this number' });
    }

    if (isExpired(tokenData.expires_at)) {
      await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    if (tokenData.attempt_count >= tokenData.max_attempts) {
      await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);
      return res.status(429).json({
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
        maxAttempts: tokenData.max_attempts,
      });
    }

    if (tokenData.otp !== otp) {
      await promisify(PasswordResetOtp.incrementAttempts.bind(PasswordResetOtp), mobileNumber);
      const attemptsUsed = tokenData.attempt_count + 1;
      const attemptsRemaining = Math.max(tokenData.max_attempts - attemptsUsed, 0);

      if (attemptsRemaining === 0) {
        await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);
        return res.status(429).json({
          message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
          maxAttempts: tokenData.max_attempts,
          attemptsRemaining: 0,
        });
      }

      return res.status(400).json({
        message: 'Invalid OTP',
        attemptsRemaining,
        maxAttempts: tokenData.max_attempts,
      });
    }

    const resetKey = crypto.randomBytes(32).toString('hex');
    await promisify(PasswordResetOtp.markVerified.bind(PasswordResetOtp), mobileNumber, resetKey);

    res.status(200).json({
      message: 'OTP verified successfully',
      resetKey,
      expiresIn: expiresInLabel(),
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password
export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { mobileNumber, resetKey, newPassword } = req.body;

    if (!mobileNumber || !resetKey || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const rows = await promisify(PasswordResetOtp.getByMobile.bind(PasswordResetOtp), mobileNumber);
    const tokenData = rows[0];

    if (
      !tokenData ||
      !tokenData.is_verified ||
      tokenData.reset_key !== resetKey
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset session' });
    }

    if (isExpired(tokenData.expires_at)) {
      await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);
      return res.status(400).json({ message: 'Reset session has expired. Please start again.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 8);
    await promisify(User.updatePassword.bind(User), tokenData.user_uuid, hashedPassword);
    await promisify(PasswordResetOtp.deleteByMobile.bind(PasswordResetOtp), mobileNumber);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
