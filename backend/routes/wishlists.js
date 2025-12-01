const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Wishlist, WishlistItem, Product, User } = require('../models');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');
const { notifyPriceDrop } = require('../services/notificationService');

// Helper function to generate share token
const generateShareToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to update price drop alerts
const checkPriceDrops = async (wishlistId) => {
  const items = await WishlistItem.findAll({
    where: { wishlistId, priceDropAlert: true },
    include: [{ model: Product, as: 'product' }]
  });

  const alerts = [];
  for (const item of items) {
    if (item.product) {
      const currentPrice = parseFloat(item.product.price);
      const addedPrice = parseFloat(item.addedAtPrice || item.product.price);
      
      if (currentPrice < addedPrice) {
        await item.update({ currentPrice });
        alerts.push({
          item,
          priceDrop: addedPrice - currentPrice,
          percentage: ((addedPrice - currentPrice) / addedPrice * 100).toFixed(2)
        });
      }
    }
  }
  return alerts;
};

// @route   POST /api/wishlists
// @desc    Create a new wishlist
// @access  Private
router.post('/', protect, [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name = 'My Wishlist', description, isPublic = false } = req.body;

    const wishlist = await Wishlist.create({
      userId: req.user.id,
      name,
      description,
      isPublic,
      shareToken: generateShareToken()
    });

    res.status(201).json({ success: true, wishlist });
  } catch (error) {
    console.error('Error creating wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/wishlists
// @desc    Get user's wishlists
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const wishlists = await Wishlist.findAll({
      where: { userId: req.user.id },
      include: [{
        model: WishlistItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{
            model: User,
            as: 'farmer',
            attributes: ['id', 'name', 'email']
          }]
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: wishlists.length, wishlists });
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/wishlists/:id
// @desc    Get single wishlist
// @access  Private (or public if shared)
router.get('/:id', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findByPk(req.params.id, {
      include: [{
        model: WishlistItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{
            model: User,
            as: 'farmer',
            attributes: ['id', 'name', 'email']
          }]
        }]
      }, {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    // Check if user has access
    if (String(wishlist.userId) !== String(req.user.id) && !wishlist.isPublic) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this wishlist' });
    }

    res.json({ success: true, wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/wishlists/share/:token
// @desc    Get wishlist by share token (public)
// @access  Public
router.get('/share/:token', async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      where: { shareToken: req.params.token },
      include: [{
        model: WishlistItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{
            model: User,
            as: 'farmer',
            attributes: ['id', 'name', 'email']
          }]
        }]
      }, {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    res.json({ success: true, wishlist });
  } catch (error) {
    console.error('Error fetching shared wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   PUT /api/wishlists/:id
// @desc    Update wishlist
// @access  Private
router.put('/:id', protect, [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this wishlist' });
    }

    const { name, description, isPublic } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    await wishlist.update(updateData);

    res.json({ success: true, wishlist });
  } catch (error) {
    console.error('Error updating wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   DELETE /api/wishlists/:id
// @desc    Delete wishlist
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this wishlist' });
    }

    await wishlist.destroy();

    res.json({ success: true, message: 'Wishlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   POST /api/wishlists/:id/items
// @desc    Add product to wishlist
// @access  Private
router.post('/:id/items', protect, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('notes').optional().trim(),
  body('priceDropAlert').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add items to this wishlist' });
    }

    const { productId, notes, priceDropAlert = true } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if item already exists
    const existingItem = await WishlistItem.findOne({
      where: { wishlistId: wishlist.id, productId }
    });

    if (existingItem) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    const item = await WishlistItem.create({
      wishlistId: wishlist.id,
      productId,
      addedAtPrice: product.price,
      currentPrice: product.price,
      priceDropAlert,
      notes
    });

    const populatedItem = await WishlistItem.findByPk(item.id, {
      include: [{
        model: Product,
        as: 'product',
        include: [{
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    res.status(201).json({ success: true, item: populatedItem });
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   DELETE /api/wishlists/:id/items/:itemId
// @desc    Remove item from wishlist
// @access  Private
router.delete('/:id/items/:itemId', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove items from this wishlist' });
    }

    const item = await WishlistItem.findByPk(req.params.itemId);

    if (!item || String(item.wishlistId) !== String(wishlist.id)) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    await item.destroy();

    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   PUT /api/wishlists/:id/items/:itemId
// @desc    Update wishlist item
// @access  Private
router.put('/:id/items/:itemId', protect, [
  body('notes').optional().trim(),
  body('priceDropAlert').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update items in this wishlist' });
    }

    const item = await WishlistItem.findByPk(req.params.itemId);

    if (!item || String(item.wishlistId) !== String(wishlist.id)) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    const { notes, priceDropAlert } = req.body;
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (priceDropAlert !== undefined) updateData.priceDropAlert = priceDropAlert;

    // Update current price from product
    const product = await Product.findByPk(item.productId);
    if (product) {
      const oldPrice = item.currentPrice || item.addedAtPrice;
      const newPrice = product.price;
      updateData.currentPrice = newPrice;

      // Check for price drop and notify
      if (oldPrice && parseFloat(newPrice) < parseFloat(oldPrice) && item.priceDropAlert) {
        notifyPriceDrop(item, oldPrice, newPrice).catch(err => {
          console.error('Error sending price drop notification:', err);
        });
      }
    }

    await item.update(updateData);

    const populatedItem = await WishlistItem.findByPk(item.id, {
      include: [{
        model: Product,
        as: 'product',
        include: [{
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    res.json({ success: true, item: populatedItem });
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/wishlists/:id/price-alerts
// @desc    Check for price drops in wishlist
// @access  Private
router.get('/:id/price-alerts', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findByPk(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    if (String(wishlist.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view price alerts for this wishlist' });
    }

    const alerts = await checkPriceDrops(wishlist.id);

    res.json({ 
      success: true, 
      count: alerts.length,
      alerts 
    });
  } catch (error) {
    console.error('Error checking price alerts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   POST /api/wishlists/quick-add/:productId
// @desc    Quick add product to default wishlist (or create one)
// @access  Private
router.post('/quick-add/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Find or create default wishlist
    let wishlist = await Wishlist.findOne({
      where: { userId: req.user.id, name: 'My Wishlist' }
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: req.user.id,
        name: 'My Wishlist',
        isPublic: false,
        shareToken: generateShareToken()
      });
    }

    // Check if already in wishlist
    const existingItem = await WishlistItem.findOne({
      where: { wishlistId: wishlist.id, productId }
    });

    if (existingItem) {
      return res.json({ 
        success: true, 
        message: 'Product already in wishlist',
        wishlist,
        item: existingItem
      });
    }

    const item = await WishlistItem.create({
      wishlistId: wishlist.id,
      productId,
      addedAtPrice: product.price,
      currentPrice: product.price,
      priceDropAlert: true
    });

    const populatedItem = await WishlistItem.findByPk(item.id, {
      include: [{
        model: Product,
        as: 'product',
        include: [{
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    res.status(201).json({ 
      success: true, 
      message: 'Product added to wishlist',
      wishlist,
      item: populatedItem
    });
  } catch (error) {
    console.error('Error quick adding to wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   DELETE /api/wishlists/quick-remove/:productId
// @desc    Quick remove product from all wishlists
// @access  Private
router.delete('/quick-remove/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlists = await Wishlist.findAll({
      where: { userId: req.user.id }
    });

    const wishlistIds = wishlists.map(w => w.id);

    const deleted = await WishlistItem.destroy({
      where: {
        wishlistId: wishlistIds,
        productId
      }
    });

    res.json({ 
      success: true, 
      message: 'Product removed from wishlists',
      deleted 
    });
  } catch (error) {
    console.error('Error quick removing from wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/wishlists/check/:productId
// @desc    Check if product is in any of user's wishlists
// @access  Private
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlists = await Wishlist.findAll({
      where: { userId: req.user.id },
      include: [{
        model: WishlistItem,
        as: 'items',
        where: { productId },
        required: false
      }]
    });

    const inWishlists = wishlists
      .filter(w => w.items && w.items.length > 0)
      .map(w => ({
        wishlistId: w.id,
        wishlistName: w.name,
        itemId: w.items[0].id
      }));

    res.json({ 
      success: true, 
      inWishlists: inWishlists.length > 0,
      wishlists: inWishlists
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;

