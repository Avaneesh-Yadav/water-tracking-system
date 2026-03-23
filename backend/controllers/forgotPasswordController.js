const bcrypt = require('bcryptjs');
const User = require('../models/User');
const crypto = require('crypto');
const smsService = require('../smsService');

// Store reset tokens temporarily (in production, use Redis or database)
const resetTokens = new Map();

// Generate reset token and send via SMS
exports.forgotPassword = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    // Check if user exists
    User.getByPhone(mobileNumber, async (err, results) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found with this mobile number' });
      }

      const user = results[0];
      
      // Generate 6-digit OTP
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Store token with expiry
      resetTokens.set(mobileNumber, {
        token: resetToken,
        expiry: tokenExpiry,
        uuid: user.uuid
      });

      try {
        // Send OTP via SMS
        await smsService.sendOTP(mobileNumber, resetToken);
        
        console.log(`✅ OTP sent to ${mobileNumber}`);

        // In development, also return OTP in response
        const response = {
          message: 'Reset OTP sent successfully to your mobile number',
          expiresIn: '15 minutes'
        };

        // Only include OTP in development mode
        if (process.env.NODE_ENV !== 'production') {
          response.otp = resetToken;
          response.note = 'OTP included in response only in development mode';
        }

        res.status(200).json(response);
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError.message);
        
        // Still allow password reset in development even if SMS fails
        if (process.env.NODE_ENV !== 'production') {
          return res.status(200).json({
            message: 'SMS service unavailable, but OTP generated',
            otp: resetToken,
            expiresIn: '15 minutes',
            warning: 'SMS sending failed - Development mode only'
          });
        }
        
        // In production, fail if SMS cannot be sent
        return res.status(500).json({ 
          message: 'Failed to send OTP. Please try again later.' 
        });
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required' });
    }

    const tokenData = resetTokens.get(mobileNumber);

    if (!tokenData) {
      return res.status(400).json({ message: 'No reset request found for this number' });
    }

    if (Date.now() > tokenData.expiry) {
      resetTokens.delete(mobileNumber);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (tokenData.token !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Generate a temporary token for password reset
    const resetKey = crypto.randomBytes(32).toString('hex');
    
    // Update token data with reset key
    resetTokens.set(mobileNumber, {
      ...tokenData,
      resetKey,
      verified: true
    });

    res.status(200).json({
      message: 'OTP verified successfully',
      resetKey
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { mobileNumber, resetKey, newPassword } = req.body;

    if (!mobileNumber || !resetKey || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tokenData = resetTokens.get(mobileNumber);

    if (!tokenData || !tokenData.verified || tokenData.resetKey !== resetKey) {
      return res.status(400).json({ message: 'Invalid or expired reset session' });
    }

    if (Date.now() > tokenData.expiry) {
      resetTokens.delete(mobileNumber);
      return res.status(400).json({ message: 'Reset session has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 8);

    // Update password in database
    User.updatePassword(tokenData.uuid, hashedPassword, (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ message: 'Failed to update password' });
      }

      // Clear reset token
      resetTokens.delete(mobileNumber);

      res.status(200).json({ message: 'Password reset successfully' });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
