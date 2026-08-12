import pool from '../db/connection/connection';

class PasswordResetOtp {
  static getByMobile(mobileNumber, callback) {
    pool.query(
      `SELECT * FROM password_reset_otps WHERE mobile_number = ? LIMIT 1`,
      [mobileNumber],
      callback
    );
  }

  /** Insert or replace OTP for the same mobile (resets attempts and verification). */
  static upsert(mobileNumber, userUuid, otp, expiresAt, maxAttempts, callback) {
    pool.query(
      `INSERT INTO password_reset_otps
        (mobile_number, user_uuid, otp, attempt_count, max_attempts, is_verified, reset_key, expires_at)
       VALUES (?, ?, ?, 0, ?, 0, NULL, ?)
       ON DUPLICATE KEY UPDATE
         user_uuid = VALUES(user_uuid),
         otp = VALUES(otp),
         attempt_count = 0,
         max_attempts = VALUES(max_attempts),
         is_verified = 0,
         reset_key = NULL,
         expires_at = VALUES(expires_at),
         updated_at = CURRENT_TIMESTAMP`,
      [mobileNumber, userUuid, otp, maxAttempts, expiresAt],
      callback
    );
  }

  static incrementAttempts(mobileNumber, callback) {
    pool.query(
      `UPDATE password_reset_otps
       SET attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE mobile_number = ?`,
      [mobileNumber],
      callback
    );
  }

  static markVerified(mobileNumber, resetKey, callback) {
    pool.query(
      `UPDATE password_reset_otps
       SET is_verified = 1, reset_key = ?, updated_at = CURRENT_TIMESTAMP
       WHERE mobile_number = ?`,
      [resetKey, mobileNumber],
      callback
    );
  }

  static deleteByMobile(mobileNumber, callback) {
    pool.query(
      `DELETE FROM password_reset_otps WHERE mobile_number = ?`,
      [mobileNumber],
      callback
    );
  }
}

export default PasswordResetOtp;
