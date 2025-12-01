const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, Product, Review, Order } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private (Admin)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalFarmers = await User.count({ where: { role: 'farmer' } });
    const totalBuyers = await User.count({ where: { role: 'buyer' } });
    const totalProducts = await Product.count();
    const pendingProducts = await Product.count({ where: { isApproved: false } });
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { status: 'pending' } });
    const totalReviews = await Review.count();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFarmers,
        totalBuyers,
        totalProducts,
        pendingProducts,
        totalOrders,
        pendingOrders,
        totalReviews
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const where = role ? { role } : {};

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (admin)
// @access  Private (Admin)
router.post('/users', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['farmer', 'buyer', 'admin']).withMessage('Invalid role')
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

    const newUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({ 
      success: true, 
      user: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin)
// @access  Private (Admin)
router.put('/users/:id', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['farmer', 'buyer', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { email, phone } = req.body;

    // Check for duplicate email or phone if being updated
    if (email || phone) {
      const whereClause = {
        id: { [Op.ne]: req.params.id }
      };
      
      if (email && phone) {
        whereClause[Op.or] = [
          { email },
          { phone }
        ];
      } else if (email) {
        whereClause.email = email;
      } else if (phone) {
        whereClause.phone = phone;
      }

      const existingUser = await User.findOne({ where: whereClause });
      if (existingUser) {
        return res.status(400).json({ message: 'Email or phone already in use' });
      }
    }

    // Don't update password if it's not provided
    const updateData = { ...req.body };
    if (!updateData.password) {
      delete updateData.password;
    }

    await user.update(updateData);

    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products (including pending)
// @access  Private (Admin)
router.get('/products', async (req, res) => {
  try {
    const { isApproved, status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }
    if (status) {
      where.status = status;
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/products/:id/approve
// @desc    Approve product
// @access  Private (Admin)
router.put('/products/:id/approve', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update({ isApproved: true });

    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/reviews
// @desc    Get all reviews
// @access  Private (Admin)
router.get('/reviews', async (req, res) => {
  try {
    const { isApproved, page = 1, limit = 10 } = req.query;
    const where = {};

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/reviews/:id/approve
// @desc    Approve review
// @access  Private (Admin)
router.put('/reviews/:id/approve', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await review.update({ isApproved: true });

    res.json({ success: true, review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/reviews/:id
// @desc    Delete review
// @access  Private (Admin)
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await review.destroy();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/farmers/:id/verify
// @desc    Verify farmer and set verification badge
// @access  Private (Admin)
router.put('/farmers/:id/verify', async (req, res) => {
  try {
    const { isVerified, verificationBadge } = req.body;

    const farmer = await User.findByPk(req.params.id);

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    if (farmer.role !== 'farmer') {
      return res.status(400).json({ success: false, message: 'User is not a farmer' });
    }

    const updateData = {};
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
    }
    if (verificationBadge !== undefined) {
      const validBadges = ['none', 'verified', 'premium', 'organic_certified'];
      if (validBadges.includes(verificationBadge)) {
        updateData.verificationBadge = verificationBadge;
      }
    }

    await farmer.update(updateData);

    const updatedFarmer = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ success: true, farmer: updatedFarmer });
  } catch (error) {
    console.error('Error verifying farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
