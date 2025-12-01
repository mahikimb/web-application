const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendSystemEmail } = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// Generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Please set it in .env file.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['farmer', 'buyer']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { phone }] 
      } 
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'buyer'
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
  body('phone').optional({ checkFalsy: true }).trim().notEmpty(),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email or phone' 
      });
    }
    
    console.log('Login attempt received:', { 
      hasEmail: !!email, 
      hasPhone: !!phone, 
      hasPassword: !!password 
    });

    // Normalize email to lowercase for comparison
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const normalizedPhone = phone ? phone.trim() : null;

    // Find user by email or phone
    let user;
    try {
      user = await User.findOne({ 
        where: normalizedEmail ? { email: normalizedEmail } : { phone: normalizedPhone },
        attributes: { exclude: [] } // Explicitly exclude nothing to avoid association issues
      });
    } catch (dbError) {
      console.error('Database error finding user:', dbError);
      console.error('Database error stack:', dbError.stack);
      return res.status(500).json({ 
        success: false,
        message: 'Database error during login',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
    
    if (!user) {
      console.log(`Login failed: User not found with ${normalizedEmail ? 'email: ' + normalizedEmail : 'phone: ' + normalizedPhone}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials. Please check your email/phone and password, or register a new account.' 
      });
    }

    // Check password
    let isMatch;
    try {
      isMatch = await user.comparePassword(password);
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      throw new Error('Password verification error: ' + passwordError.message);
    }
    
    if (!isMatch) {
      console.log(`Login failed: Incorrect password for user ${user.email || user.phone}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials. Please check your email/phone and password.' 
      });
    }

    // Generate token
    let token;
    try {
      token = generateToken(user.id);
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      throw new Error('Token generation failed: ' + tokenError.message);
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ message: 'If email exists, password reset link has been sent' });
    }

    // Generate reset token (JWT-based for simplicity)
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Build reset URL
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Try to send email; if email is not configured, still respond success with token for development
    const emailSent = await sendSystemEmail(
      user.email,
      'Reset your password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#16a34a;">Password Reset Request</h2>
          <p>Hello ${user.name || ''},</p>
          <p>We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
          <p style="margin:20px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break:break-all;color:#555;">${resetUrl}</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#888;">If you didn't request this, you can ignore this email.</p>
        </div>
      `
    );

    res.json({
      success: true,
      message: emailSent ? 'Password reset link sent to your email.' : 'Email not configured. Use the provided token to reset your password.',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpire: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

