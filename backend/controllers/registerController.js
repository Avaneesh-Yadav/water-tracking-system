const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { fullName, mobileNumber, password, address } = req.body;

    const hashedPassword = await bcrypt.hash(password, 8);
    const uuid = uuidv4();
    const role = 'USER';
    const status = 'ACTIVE';

    User.create(
      uuid,
      fullName,
      mobileNumber,
      hashedPassword,
      role,
      address,
      status,
      async (err, result) => {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({
            message: 'User registration failed',
            error: err?.sqlMessage || err?.message || String(err)
          });
        }

        const token = jwt.sign({ uuid, role }, process.env.JWT_SECRET, {
          expiresIn: '1d'
        });

        res
          .cookie('token', token, {
            httpOnly: true,
            sameSite: 'Strict',
            secure: process.env.NODE_ENV === 'production'
          })
          .status(201)
          .json({ message: 'User registered & logged in successfully', uuid });
      }
    );
  } catch (error) {
    console.error('Exception during registration:', error);
    res.status(500).json({ message: 'Registration error', error: error.message });
  }
};
