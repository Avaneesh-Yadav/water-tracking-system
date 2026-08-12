// SMS Service - Supports multiple SMS providers
// Configure your preferred provider in .env file

/**
 * SMS Providers Configuration Guide:
 * 
 * 1. TWILIO (Recommended - Most Reliable)
 *    - Sign up at https://www.twilio.com/
 *    - Get Account SID, Auth Token, and Phone Number
 *    - Add to .env:
 *      SMS_PROVIDER=twilio
 *      TWILIO_ACCOUNT_SID=your_account_sid
 *      TWILIO_AUTH_TOKEN=your_auth_token
 *      TWILIO_PHONE_NUMBER=your_twilio_number
 * 
 * 2. MSG91 (Indian Service - Good Rates)
 *    - Sign up at https://msg91.com/
 *    - Get Auth Key and Sender ID
 *    - Add to .env:
 *      SMS_PROVIDER=msg91
 *      MSG91_AUTH_KEY=your_auth_key
 *      MSG91_SENDER_ID=your_sender_id
 *      MSG91_TEMPLATE_ID=your_template_id (optional)
 * 
 * 3. FAST2SMS (Popular in India)
 *    - Sign up at https://www.fast2sms.com/
 *    - Get API Key
 *    - Add to .env:
 *      SMS_PROVIDER=fast2sms
 *      FAST2SMS_API_KEY=your_api_key
 *      FAST2SMS_SENDER_ID=your_sender_id
 * 
 * 4. AWS SNS (If using AWS)
 *    - Configure AWS credentials
 *    - Add to .env:
 *      SMS_PROVIDER=aws
 *      AWS_REGION=your_region
 *      AWS_ACCESS_KEY_ID=your_access_key
 *      AWS_SECRET_ACCESS_KEY=your_secret_key
 */

import https from 'https';
import http from 'http';

class SMSService {
  private provider: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'console';
  }

  // Helper method to make HTTP requests without axios
  async makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const protocol = options.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  // Main method to send SMS
  async sendSMS(mobileNumber, message) {
    try {
      // Format mobile number (remove +91 if present, add it back)
      const formattedNumber = this.formatMobileNumber(mobileNumber);

      switch (this.provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(formattedNumber, message);
        
        case 'msg91':
          return await this.sendViaMsg91(formattedNumber, message);
        
        case 'fast2sms':
          return await this.sendViaFast2SMS(formattedNumber, message);
        
        case 'aws':
          return await this.sendViaAWS(formattedNumber, message);
        
        default:
          // Development mode - just log to console
          console.log('\n=================================');
          console.log('📱 SMS (Development Mode)');
          console.log('To:', formattedNumber);
          console.log('Message:', message);
          console.log('=================================\n');
          return { success: true, provider: 'console' };
      }
    } catch (error) {
      console.error('SMS sending failed:', error.message);
      throw error;
    }
  }

  // Format mobile number
  formatMobileNumber(number) {
    // Remove any spaces or special characters
    let cleaned = number.replace(/\D/g, '');
    
    // If starts with 91, use as is
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    // If 10 digits, add +91
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Twilio SMS
  async sendViaTwilio(mobileNumber, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const postData = new URLSearchParams({
        To: mobileNumber,
        From: fromNumber,
        Body: message
      }).toString();

      const options = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      };

      const result = await this.makeRequest(options, postData) as { sid?: string };
      console.log('✅ SMS sent via Twilio:', result.sid);
      return { success: true, provider: 'twilio', messageId: result.sid };
    } catch (error) {
      console.error('Twilio error:', error.message);
      throw new Error('Failed to send SMS via Twilio');
    }
  }

  // MSG91 SMS
  async sendViaMsg91(mobileNumber, message) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID;

    if (!authKey) {
      throw new Error('MSG91 credentials not configured');
    }

    // Remove +91 prefix for MSG91
    const cleanNumber = mobileNumber.replace('+91', '');

    try {
      const postData = JSON.stringify({
        sender: senderId || 'TXTIND',
        short_url: '0',
        mobiles: cleanNumber,
        message: message
      });

      const options = {
        protocol: 'https:',
        hostname: 'api.msg91.com',
        path: '/api/v5/flow/',
        method: 'POST',
        headers: {
          'authkey': authKey,
          'content-type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      await this.makeRequest(options, postData);
      console.log('✅ SMS sent via MSG91');
      return { success: true, provider: 'msg91' };
    } catch (error) {
      console.error('MSG91 error:', error.message);
      throw new Error('Failed to send SMS via MSG91');
    }
  }

  // Fast2SMS
  async sendViaFast2SMS(mobileNumber, message) {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      throw new Error('Fast2SMS API key not configured');
    }

    // Remove +91 prefix for Fast2SMS
    const cleanNumber = mobileNumber.replace('+91', '');

    try {
      const params = new URLSearchParams({
        authorization: apiKey,
        message: message,
        numbers: cleanNumber,
        route: 'v3'
      });

      const options = {
        protocol: 'https:',
        hostname: 'www.fast2sms.com',
        path: `/dev/bulkV2?${params.toString()}`,
        method: 'GET',
        headers: {
          'cache-control': 'no-cache'
        }
      };

      await this.makeRequest(options);
      console.log('✅ SMS sent via Fast2SMS');
      return { success: true, provider: 'fast2sms' };
    } catch (error) {
      console.error('Fast2SMS error:', error.message);
      throw new Error('Failed to send SMS via Fast2SMS');
    }
  }

  // AWS SNS
  async sendViaAWS(mobileNumber: string, message: string) {
    try {
      // Optional dependency — only needed when SMS_PROVIDER=aws
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AWS = require("aws-sdk") as any;
      
      AWS.config.update({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });

      const sns = new AWS.SNS();
      
      const params = {
        Message: message,
        PhoneNumber: mobileNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      const result = await sns.publish(params).promise();
      
      console.log('✅ SMS sent via AWS SNS');
      return { success: true, provider: 'aws', messageId: result.MessageId };
    } catch (error) {
      console.error('AWS SNS error:', error.message);
      throw new Error('Failed to send SMS via AWS SNS');
    }
  }

  // Send OTP specifically
  async sendOTP(mobileNumber, otp) {
    const message = `Your AquaFlow password reset OTP is: ${otp}. Valid for 15 minutes. Do not share this with anyone.`;
    return await this.sendSMS(mobileNumber, message);
  }

  // Send welcome SMS
  async sendWelcomeSMS(mobileNumber, userName) {
    const message = `Welcome to AquaFlow, ${userName}! Your account has been created successfully. Start managing your water consumption today.`;
    return await this.sendSMS(mobileNumber, message);
  }

  // Send payment confirmation
  async sendPaymentConfirmation(mobileNumber, amount, billMonth) {
    const message = `Payment of ₹${amount} received for ${billMonth}. Thank you for using AquaFlow water management system.`;
    return await this.sendSMS(mobileNumber, message);
  }
}

export default new SMSService();
