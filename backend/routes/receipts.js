const express = require('express');
const router = express.Router();

// Check if PDFKit is available
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (error) {
  console.error('⚠️  PDFKit not available. Receipt generation will not work.');
  console.error('Install with: npm install pdfkit');
}

const { Order, User, Product } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/receipts/:orderId
// @desc    Generate and download receipt for an order
// @access  Private
router.get('/:orderId', protect, async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(503).json({
        success: false,
        message: 'Receipt generation is not available. PDFKit is not installed.'
      });
    }

    const { orderId } = req.params;

    // Find the order with all related data
    const order = await Order.findByPk(orderId, {
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
          attributes: ['id', 'name', 'category', 'price', 'unit']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user is the buyer or farmer
    const isBuyer = String(order.buyerId) === String(req.user.id);
    const isFarmer = String(order.farmerId) === String(req.user.id);
    
    if (!isBuyer && !isFarmer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this receipt' });
    }

    // Check if payment was made
    if (order.paymentStatus !== 'succeeded') {
      return res.status(400).json({ 
        success: false, 
        message: 'Receipt is only available for paid orders' 
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${orderId.substring(0, 8)}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Receipt #: ${orderId.substring(0, 8).toUpperCase()}`, { align: 'center' });
    doc.text(`Date: ${new Date(order.paidAt || order.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, { align: 'center' });
    doc.moveDown(2);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Buyer Information
    doc.fontSize(14).text('Bill To:', { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${order.buyer?.name || 'N/A'}`);
    doc.text(`Email: ${order.buyer?.email || 'N/A'}`);
    if (order.buyer?.phone) {
      doc.text(`Phone: ${order.buyer.phone}`);
    }
    doc.moveDown();

    // Seller Information
    doc.fontSize(14).text('Sold By:', { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${order.farmer?.name || 'N/A'}`);
    doc.text(`Email: ${order.farmer?.email || 'N/A'}`);
    if (order.farmer?.phone) {
      doc.text(`Phone: ${order.farmer.phone}`);
    }
    doc.moveDown(2);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Order Details
    doc.fontSize(14).text('Order Details:', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    
    // Product Information
    doc.text(`Product: ${order.product?.name || 'N/A'}`);
    doc.text(`Category: ${order.product?.category ? order.product.category.charAt(0).toUpperCase() + order.product.category.slice(1) : 'N/A'}`);
    doc.text(`Quantity: ${order.quantity} ${order.product?.unit || 'unit(s)'}`);
    doc.text(`Unit Price: $${parseFloat(order.unitPrice).toFixed(2)}`);
    doc.moveDown();

    // Delivery Address
    if (order.deliveryAddress) {
      doc.text('Delivery Address:');
      const address = order.deliveryAddress;
      if (address.address) doc.text(`  ${address.address}`);
      if (address.city || address.state) {
        doc.text(`  ${[address.city, address.state].filter(Boolean).join(', ')}`);
      }
      if (address.zipCode) doc.text(`  ${address.zipCode}`);
      doc.moveDown();
    }

    // Payment Information
    doc.fontSize(14).text('Payment Information:', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Payment Status: ${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}`);
    if (order.paymentMethod) {
      doc.text(`Payment Method: ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}`);
    }
    if (order.paymentIntentId) {
      doc.text(`Transaction ID: ${order.paymentIntentId.substring(0, 20)}...`);
    }
    if (order.paidAt) {
      doc.text(`Paid On: ${new Date(order.paidAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
    }
    doc.moveDown(2);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Total
    doc.fontSize(16).text(`Total Amount: $${parseFloat(order.totalPrice).toFixed(2)}`, { align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text('Thank you for your purchase!', { align: 'center' });
    doc.text('This is an automated receipt generated by Farm Marketplace', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
});

module.exports = router;

