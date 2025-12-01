const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Order, Product, User, DeliveryAddress } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { notifyNewOrder, notifyOrderStatusUpdate } = require('../services/notificationService');

// Helper function to add status to history
const addStatusToHistory = (order, newStatus, notes = null) => {
  const history = order.statusHistory || [];
  history.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    notes: notes || null
  });
  return history;
};

// Helper function to calculate estimated delivery date (default: 7 days from confirmation)
const calculateEstimatedDelivery = (days = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// @route   POST /api/orders
// @desc    Create new order request
// @access  Private (Buyer)
router.post('/', protect, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').optional().isObject(),
  body('contactPhone').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, deliveryAddress, deliveryAddressId, contactPhone, notes, deliveryCost, scheduledDeliveryDate } = req.body;

    // Get product
    const product = await Product.findByPk(productId, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone', 'profile']
      }]
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is available
    if (product.status !== 'active' || !product.isApproved) {
      return res.status(400).json({ message: 'Product is not available' });
    }

    // Check quantity
    if (quantity > product.quantity) {
      return res.status(400).json({ message: 'Requested quantity exceeds available quantity' });
    }

    // Prevent farmer from ordering their own product
    if (product.farmerId === req.user.id) {
      return res.status(400).json({ message: 'Cannot order your own product' });
    }

    const productTotal = parseFloat(product.price) * quantity;
    const deliveryCostValue = parseFloat(deliveryCost) || 0;
    const totalPrice = productTotal + deliveryCostValue;

    // Initialize status history
    const statusHistory = [{
      status: 'pending',
      timestamp: new Date().toISOString(),
      notes: 'Order created'
    }];

    const orderData = {
      buyerId: req.user.id,
      farmerId: product.farmerId,
      productId: productId,
      quantity,
      unitPrice: product.price,
      totalPrice,
      deliveryAddress: deliveryAddress || req.user.profile?.farmLocation || {},
      contactPhone: contactPhone || req.user.phone,
      notes,
      statusHistory,
      deliveryCost: deliveryCostValue,
      deliveryStatus: 'pending'
    };

    if (deliveryAddressId) {
      orderData.deliveryAddressId = deliveryAddressId;
    }

    if (scheduledDeliveryDate) {
      orderData.scheduledDeliveryDate = new Date(scheduledDeliveryDate);
    }

    const order = await Order.create(orderData);

    const populatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone', 'profile']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    // Notify farmer about new order
    notifyNewOrder(populatedOrder).catch(err => {
      console.error('Error sending new order notification:', err);
    });

    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get user's orders with filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      productId, 
      farmerId, 
      buyerId,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    
    if (req.user.role === 'farmer') {
      where.farmerId = req.user.id;
    } else if (req.user.role === 'buyer') {
      where.buyerId = req.user.id;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Product filter
    if (productId) {
      where.productId = productId;
    }

    // Farmer/Buyer filter (for admin or cross-user queries)
    if (req.user.role === 'admin') {
      if (farmerId) where.farmerId = farmerId;
      if (buyerId) where.buyerId = buyerId;
    }

    // Build order clause
    let order = [];
    switch (sortBy) {
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'status':
        order = [['status', 'ASC'], ['createdAt', 'DESC']];
        break;
      case 'price':
        order = [['totalPrice', 'DESC']];
        break;
      case 'newest':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone', 'profile']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'images', 'unit', 'price', 'category']
        }
      ],
      order,
      limit: parseInt(limit),
      offset: offset
    });

    // Filter by search term if provided (search in product name, buyer/farmer name)
    let filteredOrders = orders;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredOrders = orders.filter(order => {
        const productName = (order.product?.name || '').toLowerCase();
        const buyerName = (order.buyer?.name || '').toLowerCase();
        const farmerName = (order.farmer?.name || '').toLowerCase();
        return productName.includes(searchTerm) || 
               buyerName.includes(searchTerm) || 
               farmerName.includes(searchTerm);
      });
    }

    res.json({ 
      success: true, 
      count: filteredOrders.length,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      orders: filteredOrders 
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone', 'profile']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is involved in this order
    if (order.buyerId !== req.user.id && 
        order.farmerId !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/confirm
// @desc    Confirm order (Farmer)
// @access  Private (Farmer)
router.put('/:id/confirm', protect, [
  body('farmerNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    console.log('Confirming order:', req.params.id, 'by farmer:', req.user.id);

    const order = await Order.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only farmer can confirm - compare as strings for UUID
    const orderFarmerId = String(order.farmerId);
    const userId = String(req.user.id);
    
    console.log('Order farmer ID:', orderFarmerId, 'User ID:', userId);
    
    if (orderFarmerId !== userId) {
      return res.status(403).json({ success: false, message: 'Only farmer can confirm orders' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Order is not in pending status. Current status: ${order.status}` 
      });
    }

    if (!order.product) {
      return res.status(404).json({ success: false, message: 'Product not found for this order' });
    }

    // Check product availability - convert to numbers for comparison
    const productQuantity = parseInt(order.product.quantity) || 0;
    const orderQuantity = parseInt(order.quantity) || 0;
    
    console.log('Product quantity:', productQuantity, 'Order quantity:', orderQuantity);
    
    if (productQuantity < orderQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient product quantity. Available: ${productQuantity}, Requested: ${orderQuantity}` 
      });
    }

    // Calculate estimated delivery date (7 days from now)
    const estimatedDelivery = calculateEstimatedDelivery(7);
    
    // Update order status with history
    const updatedHistory = addStatusToHistory(order, 'confirmed', req.body.farmerNotes || 'Order confirmed by farmer');
    
    await order.update({
      status: 'confirmed',
      farmerNotes: req.body.farmerNotes || null,
      estimatedDeliveryDate: estimatedDelivery,
      statusHistory: updatedHistory
    });

    // Update product quantity
    const newQuantity = productQuantity - orderQuantity;
    await order.product.update({
      quantity: newQuantity,
      status: newQuantity === 0 ? 'sold_out' : order.product.status
    });

    const populatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    // Notify buyer about order confirmation
    notifyOrderStatusUpdate(populatedOrder, 'confirmed').catch(err => {
      console.error('Error sending order confirmation notification:', err);
    });

    console.log('Order confirmed successfully:', order.id);
    res.json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error('Error confirming order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// @route   PUT /api/orders/:id/decline
// @desc    Decline order (Farmer)
// @access  Private (Farmer)
router.put('/:id/decline', protect, [
  body('farmerNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only farmer can decline
    if (order.farmerId !== req.user.id) {
      return res.status(403).json({ message: 'Only farmer can decline orders' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order cannot be declined' });
    }

    const updatedHistory = addStatusToHistory(order, 'cancelled', req.body.farmerNotes || 'Order declined by farmer');
    
    await order.update({
      status: 'cancelled',
      cancelledBy: 'farmer',
      cancelledAt: new Date(),
      farmerNotes: req.body.farmerNotes || '',
      statusHistory: updatedHistory
    });

    const populatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    // Notify buyer about order cancellation
    notifyOrderStatusUpdate(populatedOrder, 'cancelled').catch(err => {
      console.error('Error sending order cancellation notification:', err);
    });

    res.json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/complete
// @desc    Complete order (Farmer)
// @access  Private (Farmer)
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only farmer can mark as complete
    if (order.farmerId !== req.user.id) {
      return res.status(403).json({ message: 'Only farmer can complete orders' });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ message: 'Order must be confirmed before completion' });
    }

    const updatedHistory = addStatusToHistory(order, 'completed', 'Order completed');
    
    await order.update({
      status: 'completed',
      completedAt: new Date(),
      actualDeliveryDate: new Date(),
      statusHistory: updatedHistory
    });

    const populatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    res.json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (Buyer)
// @access  Private (Buyer)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only buyer can cancel
    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Only buyer can cancel orders' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    // If confirmed, restore product quantity
    if (order.status === 'confirmed') {
      await order.product.update({
        quantity: order.product.quantity + order.quantity,
        status: order.product.status === 'sold_out' ? 'active' : order.product.status
      });
    }

    const updatedHistory = addStatusToHistory(order, 'cancelled', 'Order cancelled by buyer');
    
    await order.update({
      status: 'cancelled',
      cancelledBy: 'buyer',
      cancelledAt: new Date(),
      statusHistory: updatedHistory
    });

    const populatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    // Notify buyer about order cancellation
    notifyOrderStatusUpdate(populatedOrder, 'cancelled').catch(err => {
      console.error('Error sending order cancellation notification:', err);
    });

    res.json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id/tracking
// @desc    Get order tracking information
// @access  Private
router.get('/:id/tracking', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'category']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user is involved in this order
    if (String(order.buyerId) !== String(req.user.id) && 
        String(order.farmerId) !== String(req.user.id) &&
        req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    // Build tracking timeline from status history
    const timeline = (order.statusHistory || []).map(entry => ({
      status: entry.status,
      timestamp: entry.timestamp,
      notes: entry.notes,
      date: new Date(entry.timestamp).toLocaleString()
    }));

    // Add current status if not in history
    if (timeline.length === 0 || timeline[timeline.length - 1].status !== order.status) {
      timeline.push({
        status: order.status,
        timestamp: order.updatedAt || order.createdAt,
        notes: 'Current status',
        date: new Date(order.updatedAt || order.createdAt).toLocaleString()
      });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        actualDeliveryDate: order.actualDeliveryDate,
        createdAt: order.createdAt,
        product: order.product,
        buyer: order.buyer,
        farmer: order.farmer,
        deliveryAddress: order.deliveryAddress
      },
      timeline
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   PUT /api/orders/:id/update-delivery-date
// @desc    Update estimated delivery date (Farmer)
// @access  Private (Farmer)
router.put('/:id/update-delivery-date', protect, [
  body('estimatedDeliveryDate').isISO8601().withMessage('Valid delivery date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only farmer can update delivery date
    if (String(order.farmerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only farmer can update delivery date' });
    }

    await order.update({
      estimatedDeliveryDate: new Date(req.body.estimatedDeliveryDate)
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating delivery date:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   POST /api/orders/bulk
// @desc    Create bulk order (multiple products)
// @access  Private (Buyer)
router.post('/bulk', protect, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').optional().isObject(),
  body('contactPhone').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { items, deliveryAddress, contactPhone, notes } = req.body;

    // Validate all products first
    const productIds = items.map(item => item.productId);
    const products = await Product.findAll({
      where: { id: productIds },
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone']
      }]
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'One or more products not found' 
      });
    }

    // Group items by farmer
    const ordersByFarmer = {};
    const statusHistory = [{
      status: 'pending',
      timestamp: new Date().toISOString(),
      notes: 'Bulk order created'
    }];

    for (const item of items) {
      const product = products.find(p => String(p.id) === String(item.productId));
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          message: `Product ${item.productId} not found` 
        });
      }

      if (product.status !== 'active' || !product.isApproved) {
        return res.status(400).json({ 
          success: false, 
          message: `Product ${product.name} is not available` 
        });
      }

      if (item.quantity > product.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient quantity for ${product.name}` 
        });
      }

      if (String(product.farmerId) === String(req.user.id)) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot order your own product: ${product.name}` 
        });
      }

      const farmerId = String(product.farmerId);
      if (!ordersByFarmer[farmerId]) {
        ordersByFarmer[farmerId] = [];
      }

      ordersByFarmer[farmerId].push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: parseFloat(product.price) * item.quantity,
        product
      });
    }

    // Create orders grouped by farmer
    const createdOrders = [];
    for (const [farmerId, orderItems] of Object.entries(ordersByFarmer)) {
      for (const item of orderItems) {
        const order = await Order.create({
          buyerId: req.user.id,
          farmerId: farmerId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          deliveryAddress: deliveryAddress || req.user.profile?.farmLocation || {},
          contactPhone: contactPhone || req.user.phone,
          notes: notes || null,
          statusHistory
        });

        const populatedOrder = await Order.findByPk(order.id, {
          include: [
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'name', 'email', 'phone']
            },
            {
              model: User,
              as: 'farmer',
              attributes: ['id', 'name', 'email', 'phone']
            },
            {
              model: Product,
              as: 'product'
            }
          ]
        });

        createdOrders.push(populatedOrder);
      }
    }

    res.status(201).json({ 
      success: true, 
      count: createdOrders.length,
      orders: createdOrders 
    });
  } catch (error) {
    console.error('Error creating bulk order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   POST /api/orders/:id/reorder
// @desc    Reorder from previous order
// @access  Private (Buyer)
router.post('/:id/reorder', protect, async (req, res) => {
  try {
    const { quantity } = req.body;

    // Get the original order
    const originalOrder = await Order.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'product',
        include: [{
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        }]
      }]
    });

    if (!originalOrder) {
      return res.status(404).json({ success: false, message: 'Original order not found' });
    }

    // Verify the user is the buyer
    if (String(originalOrder.buyerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to reorder this order' });
    }

    // Check if product is still available
    const product = originalOrder.product;
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product no longer exists' });
    }

    if (product.status !== 'active' || !product.isApproved) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product is no longer available' 
      });
    }

    // Use provided quantity or original quantity
    const orderQuantity = quantity || originalOrder.quantity;

    if (orderQuantity > product.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient quantity. Available: ${product.quantity}, Requested: ${orderQuantity}` 
      });
    }

    // Create new order
    const statusHistory = [{
      status: 'pending',
      timestamp: new Date().toISOString(),
      notes: 'Reorder from previous order'
    }];

    const newOrder = await Order.create({
      buyerId: req.user.id,
      farmerId: product.farmerId,
      productId: product.id,
      quantity: orderQuantity,
      unitPrice: product.price,
      totalPrice: parseFloat(product.price) * orderQuantity,
      deliveryAddress: originalOrder.deliveryAddress || req.user.profile?.farmLocation || {},
      contactPhone: originalOrder.contactPhone || req.user.phone,
      notes: `Reorder from order #${originalOrder.id.substring(0, 8)}`,
      statusHistory
    });

    const populatedOrder = await Order.findByPk(newOrder.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error('Error creating reorder:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
