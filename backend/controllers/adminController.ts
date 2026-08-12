import type { Response } from "express";
import type { AuthRequest } from "../types/express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import XLSX from 'xlsx';
import pool from '../db/connection/connection';
import WaterConsumption from '../models/WaterConsumption';
import Settings from '../models/Settings';

// Create admin user by admin
export const createAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, mobileNumber, password, address, role } = req.body;

    // Validate required fields
    if (!fullName || !mobileNumber || !password || !address) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate role - only ADMIN or USER allowed
    const userRole = role || 'USER';
    if (!['ADMIN', 'USER'].includes(userRole)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if mobile number already exists
    User.getByPhone(mobileNumber, async (err, results) => {
      if (err) {
        console.error('Error checking mobile number:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: 'Mobile number already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 8);
      const uuid = uuidv4();
      const status = 'ACTIVE';

      // Create user (payment_status is derived from water_consumption)
      User.create(
        uuid,
        fullName,
        mobileNumber,
        hashedPassword,
        userRole,
        address,
        status,
        (err, result) => {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({
              message: 'User creation failed',
              error: err?.sqlMessage || err?.message || String(err)
            });
          }

          res.status(201).json({ 
            message: `${userRole} user created successfully`, 
            uuid,
            user: {
              uuid,
              fullName,
              mobileNumber,
              role: userRole,
              address,
              status
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Exception during user creation:', error);
    res.status(500).json({ message: 'User creation error', error: error.message });
  }
};

// Bulk import users from Excel/CSV
export const bulkImportUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read the uploaded file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'File is empty or invalid format' });
    }

    // Default password for all imported users
    const defaultPassword = 'Water@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 8);

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      imported: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (header is row 1)

      try {
        // Extract and validate data
        const fullName = row['Full Name'] || row['fullName'] || row['name'] || row['Name'];
        const mobileNumber = String(row['Mobile Number'] || row['mobileNumber'] || row['mobile'] || row['Mobile'] || '').replace(/\D/g, '');
        const address = row['Address'] || row['address'] || '';
        const role = (row['Role'] || row['role'] || 'USER').toUpperCase();

        // Validation
        if (!fullName || !mobileNumber || !address) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: row,
            error: 'Missing required fields (Full Name, Mobile Number, or Address)'
          });
          continue;
        }

        if (mobileNumber.length !== 10) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: row,
            error: 'Invalid mobile number (must be 10 digits)'
          });
          continue;
        }

        if (!['ADMIN', 'USER'].includes(role)) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: row,
            error: 'Invalid role (must be ADMIN or USER)'
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await new Promise<RowDataPacket[]>((resolve, reject) => {
          User.getByPhone(mobileNumber, (err, results) => {
            if (err) reject(err);
            else resolve(results ?? []);
          });
        });

        if (existingUser.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: row,
            error: 'Mobile number already exists in database'
          });
          continue;
        }

        // Create user
        const uuid = uuidv4();
        const status = 'ACTIVE';

        await new Promise((resolve, reject) => {
          User.create(
            uuid,
            fullName,
            mobileNumber,
            hashedPassword,
            role,
            address,
            status,
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        results.success++;
        results.imported.push({
          row: rowNumber,
          fullName,
          mobileNumber,
          role,
          defaultPassword: defaultPassword
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          data: row,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: `Import completed: ${results.success} users imported, ${results.failed} failed`,
      results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Bulk import failed', error: error.message });
  }
};

// Bulk consumption upload from Excel/CSV. Columns: connection_id (or user_uuid), month, year, consumption_liters [, rate_per_liter]
export const bulkImportConsumption = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'File is empty or invalid format' });
    }

    const defaultRate = await new Promise((resolve, reject) => {
      Settings.getRatePerLiter((err, rate) => (err ? reject(err) : resolve(rate)));
    });

    const results = { total: data.length, success: 0, failed: 0, errors: [] };

    const getUserIdByConnection = (connectionId) =>
      new Promise((resolve) => {
        pool.query('SELECT uuid FROM users WHERE connection_id = ?', [connectionId], (err, rows) => {
          if (err || !rows?.length) return resolve(null);
          resolve(rows[0].uuid);
        });
      });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      try {
        const connectionId = row['connection_id'] || row['connectionId'] || row['Connection ID'] || '';
        const userUuid = row['user_uuid'] || row['userUuid'] || (connectionId ? await getUserIdByConnection(String(connectionId).trim()) : null);
        const month = row['month'] || row['Month'] || row['month_name'] || '';
        const year = parseInt(row['year'] || row['Year'], 10);
        const liters = parseFloat(row['consumption_liters'] || row['consumptionLiters'] || row['Liters'] || row['liters'] || 0);
        const rate = row['rate_per_liter'] != null ? parseFloat(row['rate_per_liter']) : defaultRate;

        if (!userUuid || !month || !year || isNaN(liters) || liters < 0) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Missing or invalid: connection_id/user_uuid, month, year, consumption_liters' });
          continue;
        }

        const uuid = uuidv4();
        await new Promise<void>((resolve, reject) => {
          WaterConsumption.create(uuid, userUuid, String(month), year, liters, rate, {}, (err) =>
            err ? reject(err) : resolve()
          );
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ row: rowNum, error: e.message || String(e) });
      }
    }

    res.status(200).json({
      message: `Bulk consumption: ${results.success} added, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Bulk consumption import error:', error);
    res.status(500).json({ message: 'Bulk consumption import failed', error: error.message });
  }
};

// Bulk status update: body { uuids: string[], status: 'ACTIVE' | 'REVOKE' | 'DELETED' }
export const bulkUpdateStatus = (req: AuthRequest, res: Response) => {
  try {
    const { uuids, status } = req.body;
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ message: 'uuids array is required' });
    }
    if (!['ACTIVE', 'REVOKE', 'DELETED'].includes(status)) {
      return res.status(400).json({ message: 'status must be ACTIVE, REVOKE, or DELETED' });
    }

    const placeholders = uuids.map(() => '?').join(',');
    pool.query(
      `UPDATE users SET status = ?, updated_at = ? WHERE uuid IN (${placeholders})`,
      [status, new Date(), ...uuids],
      (err, result) => {
        if (err) {
          console.error('Bulk status update error:', err);
          return res.status(500).json({ message: 'Bulk status update failed', error: err.message });
        }
        const header = result as unknown as ResultSetHeader;
        res.json({
          message: `Status updated to ${status} for ${header.affectedRows} user(s)`,
          updated: header.affectedRows,
        });
      }
    );
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ message: 'Bulk status update failed', error: error.message });
  }
};
