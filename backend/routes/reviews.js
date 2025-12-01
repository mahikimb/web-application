const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Review, Order, Product, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/reviews
// @desc    Create review
// @access  Private (Buyer)
router.post('/', protect, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, rating, comment } = req.body;

    // Get order
    const order = await Order.findByPk(orderId, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if buyer owns the order
    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed orders' });
    }

    // Check if review already exists for this order
    const existingReview = await Review.findOne({ where: { orderId } });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already exists for this order' });
    }

    // Create review (auto-approved for now)
    const review = await Review.create({
      buyerId: req.user.id,
      farmerId: order.farmerId,
      productId: order.productId,
      orderId: orderId,
      rating,
      comment,
      isApproved: true // Auto-approve reviews
    });

    // Update product ratings
    const reviews = await Review.findAll({ 
      where: { productId: order.productId } 
    });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    await order.product.update({
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalReviews: reviews.length
    });

    const populatedReview = await Review.findByPk(review.id, {
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
      ]
    });

    res.status(201).json({ success: true, review: populatedReview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: {
        productId: req.params.productId,
        isApproved: true
      },
      include: [{
        model: User,
        as: 'buyer',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/farmer/:farmerId
// @desc    Get reviews for a farmer
// @access  Public
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: {
        farmerId: req.params.farmerId,
        isApproved: true
      },
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
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
