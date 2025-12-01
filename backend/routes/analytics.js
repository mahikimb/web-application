const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Order, Product, Review, User } = require('../models');
const { protect } = require('../middleware/auth');
const { Sequelize } = require('sequelize');

// @route   GET /api/analytics/farmer
// @desc    Get farmer analytics (sales, revenue, products, trends)
// @access  Private (Farmer)
router.get('/farmer', protect, async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Verify user is a farmer
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Farmers only.' });
    }

    // Date range (default: last 30 days)
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Sales Analytics
    const totalOrders = await Order.count({
      where: {
        farmerId,
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const completedOrders = await Order.count({
      where: {
        farmerId,
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const pendingOrders = await Order.count({
      where: {
        farmerId,
        status: 'pending',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const confirmedOrders = await Order.count({
      where: {
        farmerId,
        status: 'confirmed',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    // Revenue Analytics
    const revenueData = await Order.findAll({
      where: {
        farmerId,
        status: 'completed',
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'totalRevenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalPaidOrders']
      ],
      raw: true
    });

    const totalRevenue = revenueData[0]?.totalRevenue ? parseFloat(revenueData[0].totalRevenue) : 0;
    const totalPaidOrders = revenueData[0]?.totalPaidOrders ? parseInt(revenueData[0].totalPaidOrders) : 0;

    // Average order value
    const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0;

    // Revenue by date (for chart)
    const revenueByDate = await Order.findAll({
      where: {
        farmerId,
        status: 'completed',
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'revenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Order trends (by status)
    const orderTrends = await Order.findAll({
      where: {
        farmerId,
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [
        Sequelize.fn('DATE', Sequelize.col('created_at')),
        'status'
      ],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Popular Products
    const popularProducts = await Order.findAll({
      where: {
        farmerId,
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'category', 'price', 'images']
      }],
      attributes: [
        'productId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'totalRevenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orderCount']
      ],
      group: ['productId', 'product.id', 'product.name', 'product.category', 'product.price', 'product.images'],
      order: [[Sequelize.fn('SUM', Sequelize.col('total_price')), 'DESC']],
      limit: 10
    });

    // Products by category
    const productsByCategory = await Order.findAll({
      where: {
        farmerId,
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['category']
      }],
      attributes: [
        [Sequelize.literal('product.category'), 'category'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'revenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders']
      ],
      group: [Sequelize.literal('product.category')],
      order: [[Sequelize.fn('SUM', Sequelize.col('total_price')), 'DESC']],
      raw: true
    });

    // All-time stats
    const allTimeOrders = await Order.count({ where: { farmerId } });
    const allTimeRevenue = await Order.sum('totalPrice', {
      where: {
        farmerId,
        status: 'completed',
        paymentStatus: 'succeeded'
      }
    }) || 0;

    // Always return analytics data, even if empty
    res.json({
      success: true,
      analytics: {
        period: { start, end },
        sales: {
          totalOrders: totalOrders || 0,
          completedOrders: completedOrders || 0,
          pendingOrders: pendingOrders || 0,
          confirmedOrders: confirmedOrders || 0,
          allTimeOrders: allTimeOrders || 0
        },
        revenue: {
          totalRevenue: totalRevenue ? totalRevenue.toFixed(2) : '0.00',
          avgOrderValue: avgOrderValue ? avgOrderValue.toFixed(2) : '0.00',
          totalPaidOrders: totalPaidOrders || 0,
          allTimeRevenue: allTimeRevenue ? parseFloat(allTimeRevenue).toFixed(2) : '0.00',
          revenueByDate: revenueByDate && revenueByDate.length > 0 ? revenueByDate.map(item => ({
            date: item.date,
            revenue: parseFloat(item.revenue || 0).toFixed(2),
            orders: parseInt(item.orders || 0)
          })) : [],
          byCategory: productsByCategory && productsByCategory.length > 0 ? productsByCategory.map(item => ({
            category: item.category,
            revenue: parseFloat(item.revenue || 0).toFixed(2),
            orders: parseInt(item.orders || 0)
          })) : []
        },
        popularProducts: popularProducts && popularProducts.length > 0 ? popularProducts.map(item => ({
          product: item.product,
          totalQuantity: parseInt(item.dataValues?.totalQuantity || item.totalQuantity || 0),
          totalRevenue: parseFloat(item.dataValues?.totalRevenue || item.totalRevenue || 0).toFixed(2),
          orderCount: parseInt(item.dataValues?.orderCount || item.orderCount || 0)
        })) : [],
        orderTrends: orderTrends && orderTrends.length > 0 ? orderTrends.map(item => ({
          date: item.date,
          count: parseInt(item.count || 0),
          status: item.status
        })) : []
      }
    });
  } catch (error) {
    console.error('Error fetching farmer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/buyer
// @desc    Get buyer analytics (purchases, spending, categories)
// @access  Private (Buyer)
router.get('/buyer', protect, async (req, res) => {
  try {
    const buyerId = req.user.id;

    // Verify user is a buyer
    if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Buyers only.' });
    }

    // Date range (default: last 30 days)
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Purchase History
    const totalOrders = await Order.count({
      where: {
        buyerId,
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const completedOrders = await Order.count({
      where: {
        buyerId,
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const paidOrders = await Order.count({
      where: {
        buyerId,
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    // Spending Analytics
    const spendingData = await Order.findAll({
      where: {
        buyerId,
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'totalSpent'],
        [Sequelize.fn('AVG', Sequelize.col('total_price')), 'avgOrderValue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalOrders']
      ],
      raw: true
    });

    const totalSpent = spendingData[0]?.totalSpent ? parseFloat(spendingData[0].totalSpent) : 0;
    const avgOrderValue = spendingData[0]?.avgOrderValue ? parseFloat(spendingData[0].avgOrderValue) : 0;

    // Spending by date (for chart)
    const spendingByDate = await Order.findAll({
      where: {
        buyerId,
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'spent'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Favorite Categories
    const favoriteCategories = await Order.findAll({
      where: {
        buyerId,
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['category']
      }],
      attributes: [
        [Sequelize.literal('product.category'), 'category'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'totalSpent'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orderCount']
      ],
      group: [Sequelize.literal('product.category')],
      order: [[Sequelize.fn('SUM', Sequelize.col('total_price')), 'DESC']],
      raw: true
    });

    // Top Farmers (by spending)
    const topFarmers = await Order.findAll({
      where: {
        buyerId,
        paymentStatus: 'succeeded',
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'name']
      }],
      attributes: [
        'farmerId',
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'totalSpent'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'orderCount']
      ],
      group: ['farmerId', 'farmer.id', 'farmer.name'],
      order: [[Sequelize.fn('SUM', Sequelize.col('total_price')), 'DESC']],
      limit: 5
    });

    // All-time stats
    const allTimeOrders = await Order.count({ where: { buyerId } });
    const allTimeSpent = await Order.sum('totalPrice', {
      where: {
        buyerId,
        paymentStatus: 'succeeded'
      }
    }) || 0;

    // Recent purchases
    const recentPurchases = await Order.findAll({
      where: {
        buyerId,
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'category', 'images']
      }, {
        model: User,
        as: 'farmer',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Always return analytics data, even if empty
    res.json({
      success: true,
      analytics: {
        period: { start, end },
        purchases: {
          totalOrders: totalOrders || 0,
          completedOrders: completedOrders || 0,
          paidOrders: paidOrders || 0,
          allTimeOrders: allTimeOrders || 0
        },
        spending: {
          totalSpent: totalSpent ? totalSpent.toFixed(2) : '0.00',
          avgOrderValue: avgOrderValue ? avgOrderValue.toFixed(2) : '0.00',
          allTimeSpent: allTimeSpent ? parseFloat(allTimeSpent).toFixed(2) : '0.00',
          spendingByDate: spendingByDate && spendingByDate.length > 0 ? spendingByDate.map(item => ({
            date: item.date,
            spent: parseFloat(item.spent || 0).toFixed(2),
            orders: parseInt(item.orders || 0)
          })) : []
        },
        favoriteCategories: favoriteCategories && favoriteCategories.length > 0 ? favoriteCategories.map(item => ({
          category: item.category,
          totalQuantity: parseInt(item.totalQuantity || 0),
          totalSpent: parseFloat(item.totalSpent || 0).toFixed(2),
          orderCount: parseInt(item.orderCount || 0)
        })) : [],
        topFarmers: topFarmers && topFarmers.length > 0 ? topFarmers.map(item => ({
          farmer: item.farmer,
          totalSpent: parseFloat(item.dataValues?.totalSpent || item.totalSpent || 0).toFixed(2),
          orderCount: parseInt(item.dataValues?.orderCount || item.orderCount || 0)
        })) : [],
        recentPurchases: recentPurchases && recentPurchases.length > 0 ? recentPurchases.map(order => ({
          id: order.id,
          product: order.product,
          farmer: order.farmer,
          quantity: order.quantity,
          totalPrice: parseFloat(order.totalPrice).toFixed(2),
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt
        })) : []
      }
    });
  } catch (error) {
    console.error('Error fetching buyer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

