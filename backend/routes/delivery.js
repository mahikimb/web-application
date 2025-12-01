const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { DeliveryAddress, Order, Product, User } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

// Helper function to calculate delivery cost
const calculateDeliveryCost = (distance, weight = 1) => {
  // Base cost: $5
  // Per mile: $0.50
  // Weight multiplier: 1.0 for base weight
  const baseCost = 5.00;
  const perMileCost = 0.50;
  const weightMultiplier = Math.max(1.0, weight / 10); // Every 10 units adds 1x multiplier
  
  return baseCost + (distance * perMileCost * weightMultiplier);
};

// @route   GET /api/delivery/addresses
// @desc    Get user's delivery addresses
// @access  Private
router.get('/addresses', protect, async (req, res) => {
  try {
    if (!DeliveryAddress) {
      return res.json({
        success: true,
        addresses: []
      });
    }

    const addresses = await DeliveryAddress.findAll({
      where: { userId: req.user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      addresses
    });
  } catch (error) {
    console.error('Error fetching delivery addresses:', error);
    console.error('Error stack:', error.stack);
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes('does not exist')) {
      return res.json({
        success: true,
        addresses: []
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/delivery/addresses
// @desc    Create a new delivery address
// @access  Private
router.post('/addresses', protect, [
  body('label').notEmpty().withMessage('Label is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zipCode').notEmpty().withMessage('Zip code is required')
], async (req, res) => {
  try {
    // Check if DeliveryAddress model is available
    if (!DeliveryAddress) {
      return res.status(500).json({
        success: false,
        message: 'Delivery address service is not available. Please contact support.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { label, address, city, state, zipCode, country, phone, isDefault, latitude, longitude } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await DeliveryAddress.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    // Check if table exists, if not try to create it
    try {
      await DeliveryAddress.findOne({ limit: 1 });
    } catch (tableError) {
      if (tableError.message && tableError.message.includes('does not exist')) {
        console.error('delivery_addresses table does not exist. Please restart the server to create it.');
        return res.status(500).json({
          success: false,
          message: 'Delivery addresses table not found. Please restart the server.',
          error: 'Table does not exist'
        });
      }
    }

    // Convert latitude and longitude to numbers if provided
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const deliveryAddress = await DeliveryAddress.create({
      userId: req.user.id,
      label: label.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: (country || 'USA').trim(),
      phone: phone ? phone.trim() : null,
      isDefault: isDefault || false,
      latitude: lat,
      longitude: lng
    });

    res.status(201).json({
      success: true,
      address: deliveryAddress
    });
  } catch (error) {
    console.error('Error creating delivery address:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Failed to save address',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/delivery/addresses/:id
// @desc    Update a delivery address
// @access  Private
router.put('/addresses/:id', protect, [
  body('label').optional().notEmpty().withMessage('Label cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('city').optional().notEmpty().withMessage('City cannot be empty'),
  body('state').optional().notEmpty().withMessage('State cannot be empty'),
  body('zipCode').optional().notEmpty().withMessage('Zip code cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = await DeliveryAddress.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (String(address.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { label, address: addr, city, state, zipCode, country, phone, isDefault, latitude, longitude } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault && !address.isDefault) {
      await DeliveryAddress.update(
        { isDefault: false },
        { where: { userId: req.user.id, id: { [Op.ne]: address.id } } }
      );
    }

    await address.update({
      label: label || address.label,
      address: addr || address.address,
      city: city || address.city,
      state: state || address.state,
      zipCode: zipCode || address.zipCode,
      country: country || address.country,
      phone: phone !== undefined ? phone : address.phone,
      isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      latitude: latitude !== undefined ? latitude : address.latitude,
      longitude: longitude !== undefined ? longitude : address.longitude
    });

    res.json({
      success: true,
      address
    });
  } catch (error) {
    console.error('Error updating delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/delivery/addresses/:id
// @desc    Delete a delivery address
// @access  Private
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const address = await DeliveryAddress.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (String(address.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await address.destroy();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting delivery address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/delivery/calculate-cost
// @desc    Calculate delivery cost
// @access  Private
router.post('/calculate-cost', protect, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { productId, quantity, deliveryAddress } = req.body;

    const product = await Product.findByPk(productId, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'profile']
      }]
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get farm location
    const farmLocation = product.farmLocation || product.farmer?.profile?.farmLocation;
    
    if (!farmLocation || !farmLocation.city || !farmLocation.state) {
      return res.status(400).json({
        success: false,
        message: 'Farm location not available for delivery cost calculation'
      });
    }

    // Get delivery location
    const deliveryCity = deliveryAddress.city;
    const deliveryState = deliveryAddress.state;

    // Simple distance calculation (in a real app, you'd use geocoding API)
    // For now, we'll use a simple calculation based on city/state
    // If coordinates are available, use them; otherwise estimate
    let distance = 10; // Default 10 miles

    if (farmLocation.latitude && farmLocation.longitude && 
        deliveryAddress.latitude && deliveryAddress.longitude) {
      distance = calculateDistance(
        parseFloat(farmLocation.latitude),
        parseFloat(farmLocation.longitude),
        parseFloat(deliveryAddress.latitude),
        parseFloat(deliveryAddress.longitude)
      );
    } else {
      // Estimate based on same city/state
      if (farmLocation.city === deliveryCity && farmLocation.state === deliveryState) {
        distance = 5; // Same city: 5 miles
      } else if (farmLocation.state === deliveryState) {
        distance = 50; // Same state: 50 miles
      } else {
        distance = 200; // Different state: 200 miles
      }
    }

    // Calculate weight (quantity * unit weight estimate)
    const weight = quantity * 1; // Assume 1 unit = 1 lb

    const deliveryCost = calculateDeliveryCost(distance, weight);

    res.json({
      success: true,
      cost: {
        distance: distance.toFixed(2),
        weight,
        deliveryCost: deliveryCost.toFixed(2),
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Error calculating delivery cost:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/delivery/tracking/:orderId
// @desc    Get delivery tracking information
// @access  Private
router.get('/tracking/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'profile']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'farmLocation']
        },
        {
          model: DeliveryAddress,
          as: 'deliveryAddressRef',
          attributes: ['id', 'label', 'address', 'city', 'state', 'zipCode', 'phone']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
    if (String(order.buyerId) !== String(req.user.id) && 
        String(order.farmerId) !== String(req.user.id) &&
        req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Normalize delivery address whether it's from JSON column or association
    let normalizedDeliveryAddress = null;
    try {
      // Prefer associated model if present; fall back to JSON field
      const assoc = order.deliveryAddressRef;
      if (assoc) {
        normalizedDeliveryAddress = {
          address: assoc.address || null,
          city: assoc.city || null,
          state: assoc.state || null,
          zipCode: assoc.zipCode || null
        };
      } else if (order.deliveryAddress) {
        const src = order.deliveryAddress;
        normalizedDeliveryAddress = {
          address: src.address || null,
          city: src.city || null,
          state: src.state || null,
          zipCode: src.zipCode || null
        };
      }
    } catch (_) {
      normalizedDeliveryAddress = null;
    }

    // Build tracking information
    const tracking = {
      orderId: order.id,
      trackingNumber: order.trackingNumber,
      deliveryStatus: order.deliveryStatus,
      deliveryService: order.deliveryService,
      scheduledDeliveryDate: order.scheduledDeliveryDate,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
      deliveryAddress: normalizedDeliveryAddress,
      statusHistory: order.statusHistory || [],
      deliveryCost: order.deliveryCost
    };

    res.json({
      success: true,
      tracking
    });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/delivery/tracking/:orderId
// @desc    Update delivery tracking (Farmer/Admin)
// @access  Private (Farmer/Admin)
router.put('/tracking/:orderId', protect, [
  body('deliveryStatus').optional().isIn(['pending', 'scheduled', 'in_transit', 'out_for_delivery', 'delivered', 'failed']),
  body('trackingNumber').optional().trim(),
  body('deliveryService').optional().trim(),
  body('scheduledDeliveryDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const order = await Order.findByPk(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only farmer or admin can update tracking
    if (String(order.farmerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { deliveryStatus, trackingNumber, deliveryService, scheduledDeliveryDate } = req.body;

    const updateData = {};
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (deliveryService) updateData.deliveryService = deliveryService;
    if (scheduledDeliveryDate) updateData.scheduledDeliveryDate = new Date(scheduledDeliveryDate);

    // If status is delivered, set actual delivery date
    if (deliveryStatus === 'delivered' && !order.actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date();
      updateData.status = 'completed';
    }

    // Update status history
    const history = order.statusHistory || [];
    if (deliveryStatus && deliveryStatus !== order.deliveryStatus) {
      history.push({
        status: deliveryStatus,
        timestamp: new Date().toISOString(),
        notes: trackingNumber ? `Tracking: ${trackingNumber}` : null
      });
      updateData.statusHistory = history;
    }

    await order.update(updateData);
    
    // Reload order with associations
    const updatedOrder = await Order.findByPk(req.params.orderId, {
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
        },
        {
          model: DeliveryAddress,
          as: 'deliveryAddressRef',
          attributes: ['id', 'label', 'address', 'city', 'state', 'zipCode', 'phone'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Delivery tracking updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating delivery tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

