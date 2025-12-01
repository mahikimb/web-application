const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
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

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim().notEmpty(),
  body('bio').optional().trim(),
  body('farmStory').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };

    // If email or phone is being updated, check for duplicates
    if (updateData.email || updateData.phone) {
      const whereClause = {
        id: { [Op.ne]: req.user.id }
      };
      
      if (updateData.email && updateData.phone) {
        whereClause[Op.or] = [
          { email: updateData.email },
          { phone: updateData.phone }
        ];
      } else if (updateData.email) {
        whereClause.email = updateData.email;
      } else if (updateData.phone) {
        whereClause.phone = updateData.phone;
      }

      const existingUser = await User.findOne({ where: whereClause });

      if (existingUser) {
        return res.status(400).json({ message: 'Email or phone already in use' });
      }
    }

    await req.user.update(updateData);

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/farmer/:id/profile
// @desc    Get farmer public profile with products, ratings, and stats
// @access  Public
// NOTE: This route must come before /:id to avoid route conflicts
router.get('/farmer/:id/profile', async (req, res) => {
  try {
    const { Product, Review, Order, Follow } = require('../models');
    const { Sequelize } = require('sequelize');

    const farmer = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'profile', 'bio', 'farmStory', 'isVerified', 'verificationBadge', 'createdAt']
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    if (farmer.role !== 'farmer') {
      return res.status(400).json({ success: false, message: 'User is not a farmer' });
    }

    // Get all active products
    const products = await Product.findAll({
      where: {
        farmerId: farmer.id,
        status: 'active',
        isApproved: true
      },
      order: [['createdAt', 'DESC']]
    });

    // Calculate average rating from reviews
    const reviews = await Review.findAll({
      where: { farmerId: farmer.id },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalReviews']
      ],
      raw: true
    });

    const averageRating = reviews[0]?.averageRating ? parseFloat(reviews[0].averageRating) : 0;
    const totalReviews = reviews[0]?.totalReviews ? parseInt(reviews[0].totalReviews) : 0;

    // Get recent reviews
    const recentReviews = await Review.findAll({
      where: { farmerId: farmer.id },
      include: [{
        model: User,
        as: 'buyer',
        attributes: ['id', 'name']
      }, {
        model: Product,
        as: 'product',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get stats
    const totalProducts = products.length;
    const totalOrders = await Order.count({
      where: { farmerId: farmer.id, status: 'completed' }
    });
    const totalFollowers = await Follow.count({
      where: { followingId: farmer.id }
    });

    // Check if current user is following (if authenticated)
    let isFollowing = false;
    // Get user from token if available (using middleware but route is public)
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(decoded.id);
        if (currentUser) {
          const follow = await Follow.findOne({
            where: {
              followerId: currentUser.id,
              followingId: farmer.id
            }
          });
          isFollowing = !!follow;
        }
      } catch (err) {
        // Token invalid or expired, continue without user
      }
    }

    res.json({
      success: true,
      farmer: {
        ...farmer.toJSON(),
        stats: {
          totalProducts,
          totalOrders,
          totalReviews,
          totalFollowers,
          averageRating: averageRating.toFixed(1)
        },
        products,
        recentReviews,
        isFollowing
      }
    });
  } catch (error) {
    console.error('Error fetching farmer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (public profile)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'profile', 'bio', 'farmStory', 'isVerified', 'verificationBadge', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
