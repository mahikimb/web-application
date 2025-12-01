const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { Product, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { notifyNewProduct } = require('../services/notificationService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   GET /api/products
// @desc    Get all products with advanced filters, search, and sorting
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      city, 
      state,
      minPrice, 
      maxPrice, 
      search, 
      status = 'active',
      isOrganic,
      minRating,
      sortBy = 'newest', // newest, priceLow, priceHigh, rating, popularity
      page = 1,
      limit = 20
    } = req.query;
    
    const where = { 
      isApproved: true, 
      status 
    };

    // Category filter
    if (category) {
      where.category = category;
    }

    // Organic filter
    if (isOrganic !== undefined) {
      where.isOrganic = isOrganic === 'true' || isOrganic === true;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    // Rating filter
    if (minRating) {
      where.averageRating = {
        [Op.gte]: parseFloat(minRating)
      };
    }

    // Enhanced search - search in name, description, and farmer name
    if (search) {
      const searchTerm = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: searchTerm } },
        { description: { [Op.iLike]: searchTerm } },
        { qualityNotes: { [Op.iLike]: searchTerm } }
      ];
    }

    // Build order clause based on sortBy
    let order = [];
    switch (sortBy) {
      case 'priceLow':
        order = [['price', 'ASC']];
        break;
      case 'priceHigh':
        order = [['price', 'DESC']];
        break;
      case 'rating':
        order = [['averageRating', 'DESC'], ['totalReviews', 'DESC']];
        break;
      case 'popularity':
        order = [['totalReviews', 'DESC'], ['averageRating', 'DESC']];
        break;
      case 'newest':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    // Fetch products with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let products = await Product.findAll({
      where,
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone', 'profile']
      }],
      order,
      limit: parseInt(limit),
      offset: offset
    });

    // Filter by city and state if provided (JSONB field filtering)
    if (city || state) {
      products = products.filter(product => {
        const farmLocation = product.farmLocation || {};
        const productCity = (farmLocation.city || '').toLowerCase();
        const productState = (farmLocation.state || '').toLowerCase();
        
        const cityMatch = !city || productCity.includes(city.toLowerCase());
        const stateMatch = !state || productState.includes(state.toLowerCase());
        
        return cityMatch && stateMatch;
      });
    }

    // Get total count for pagination (without location filters for accurate count)
    const totalCount = await Product.count({ where });

    console.log(`Returning ${products.length} approved products (page ${page}, total: ${totalCount})`);
    res.json({ 
      success: true, 
      count: products.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      products 
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/products/farmer/my-products
// @desc    Get farmer's products
// @access  Private (Farmer)
// NOTE: This route MUST be defined BEFORE /:id route to avoid route conflicts
router.get('/farmer/my-products', protect, authorize('farmer', 'admin'), async (req, res) => {
  try {
    console.log('Fetching products for farmer:', req.user.id, 'Type:', typeof req.user.id);
    
    // Ensure we're using the correct UUID format - convert to string if needed
    const farmerId = String(req.user.id);
    
    // First, let's verify the user ID format
    console.log('Farmer ID (string):', farmerId);
    
    // Try querying with explicit UUID comparison
    const products = await Product.findAll({
      where: { 
        farmerId: farmerId 
      },
      order: [['createdAt', 'DESC']],
      raw: false // Return Sequelize instances, not plain objects
    });

    console.log(`Found ${products.length} products for farmer ${farmerId}`);
    
    // If no products found, let's check if there are any products at all for debugging
    if (products.length === 0) {
      const allProducts = await Product.findAll({ limit: 5, attributes: ['id', 'farmerId', 'name'] });
      console.log('Sample products in database (first 5):', allProducts.map(p => ({ 
        id: p.id, 
        farmerId: p.farmerId, 
        name: p.name 
      })));
    }
    
    // Convert Sequelize instances to plain objects for JSON response
    const productsData = products.map(product => {
      const json = product.toJSON ? product.toJSON() : product;
      // Ensure farmerId is included
      if (!json.farmerId && product.farmerId) {
        json.farmerId = product.farmerId;
      }
      return json;
    });
    
    console.log('Products data (first product):', productsData.length > 0 ? JSON.stringify(productsData[0], null, 2) : 'No products');
    
    res.json({ 
      success: true, 
      count: productsData.length, 
      products: productsData 
    });
  } catch (error) {
    console.error('Error fetching farmer products:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone', 'profile']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Farmer)
router.post('/', protect, authorize('farmer', 'admin'), upload.array('images', 5), async (req, res) => {
  try {
    // Manual validation for FormData
    const errors = [];
    
    if (!req.body.name || req.body.name.trim() === '') {
      errors.push({ field: 'name', message: 'Product name is required' });
    }
    
    const validCategories = ['vegetables', 'fruits', 'grains', 'dairy', 'poultry', 'herbs', 'other'];
    if (!req.body.category || !validCategories.includes(req.body.category)) {
      errors.push({ field: 'category', message: 'Invalid category' });
    }
    
    if (!req.body.description || req.body.description.trim() === '') {
      errors.push({ field: 'description', message: 'Description is required' });
    }
    
    const price = parseFloat(req.body.price);
    if (isNaN(price) || price < 0) {
      errors.push({ field: 'price', message: 'Price must be a positive number' });
    }
    
    const quantity = parseInt(req.body.quantity);
    if (isNaN(quantity) || quantity < 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be a non-negative integer' });
    }
    
    const validUnits = ['kg', 'lb', 'piece', 'dozen', 'bunch', 'bag'];
    if (!req.body.unit || !validUnits.includes(req.body.unit)) {
      errors.push({ field: 'unit', message: 'Invalid unit' });
    }
    
    if (!req.body.harvestDate) {
      errors.push({ field: 'harvestDate', message: 'Harvest date is required' });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors 
      });
    }

    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    let farmLocation = {};
    if (req.body.farmLocation) {
      try {
        farmLocation = typeof req.body.farmLocation === 'string' 
          ? JSON.parse(req.body.farmLocation) 
          : req.body.farmLocation;
      } catch (e) {
        console.error('Error parsing farmLocation:', e);
        farmLocation = {};
      }
    }

    // Handle isOrganic - it can come as string "true"/"false" or boolean
    let isOrganic = false;
    if (req.body.isOrganic !== undefined) {
      if (typeof req.body.isOrganic === 'string') {
        isOrganic = req.body.isOrganic === 'true' || req.body.isOrganic === '1';
      } else {
        isOrganic = Boolean(req.body.isOrganic);
      }
    }

    const productData = {
      name: req.body.name.trim(),
      category: req.body.category,
      description: req.body.description.trim(),
      price: price,
      quantity: quantity,
      unit: req.body.unit,
      harvestDate: new Date(req.body.harvestDate),
      qualityNotes: req.body.qualityNotes ? req.body.qualityNotes.trim() : null,
      isOrganic: isOrganic,
      farmLocation,
      images,
      farmerId: req.user.id,
      // Auto-approve products for now (in production, you might want admin approval)
      isApproved: true // Changed from: req.user.role === 'admin'
    };

    console.log('Creating product with data:', { ...productData, images: images.length });
    console.log('Farmer ID being used:', req.user.id, 'Type:', typeof req.user.id);

    const product = await Product.create(productData);
    
    console.log('Product created successfully. ID:', product.id, 'FarmerId:', product.farmerId);

    const productWithFarmer = await Product.findByPk(product.id, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone', 'profile']
      }]
    });

    // Notify followers about new product
    notifyNewProduct(productWithFarmer).catch(err => {
      console.error('Error sending new product notification:', err);
    });

    res.status(201).json({ success: true, product: productWithFarmer });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Farmer/Owner or Admin)
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check ownership or admin
    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    const updateData = {};

    if (req.body.name) updateData.name = req.body.name;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price) updateData.price = Number(req.body.price);
    if (req.body.quantity) updateData.quantity = Number(req.body.quantity);
    if (req.body.unit) updateData.unit = req.body.unit;
    if (req.body.harvestDate) updateData.harvestDate = new Date(req.body.harvestDate);
    if (req.body.qualityNotes !== undefined) updateData.qualityNotes = req.body.qualityNotes;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.isOrganic !== undefined) {
      updateData.isOrganic = req.body.isOrganic === 'true' || req.body.isOrganic === true;
    }

    if (req.body.farmLocation) {
      try {
        updateData.farmLocation = typeof req.body.farmLocation === 'string' 
          ? JSON.parse(req.body.farmLocation) 
          : req.body.farmLocation;
      } catch (e) {
        // Keep existing farmLocation if parsing fails
      }
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      updateData.images = [...(product.images || []), ...newImages];
    }

    await product.update(updateData);

    const updatedProduct = await Product.findByPk(product.id, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name', 'email', 'phone', 'profile']
      }]
    });

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Farmer/Owner or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check ownership or admin
    if (product.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await product.destroy();

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
