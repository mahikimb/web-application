const express = require('express');
const router = express.Router();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️  WARNING: STRIPE_SECRET_KEY is not set in environment variables');
}
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const { Order, Product, User } = require('../models');
const { notifyPaymentSucceeded } = require('../services/notificationService');
const { protect } = require('../middleware/auth');

// @route   POST /api/payments/create-intent
// @desc    Create a payment intent for an order
// @access  Private
router.post('/create-intent', protect, async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not configured. Please set STRIPE_SECRET_KEY in .env');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment system is not configured. Please contact support.' 
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    console.log('Creating payment intent for order:', orderId, 'User:', req.user.id);

    // Find the order
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user is the buyer
    if (String(order.buyerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this order' });
    }

    // Check if order is confirmed
    if (order.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be confirmed before payment' 
      });
    }

    // Check if already paid
    if (order.paymentStatus === 'succeeded') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order has already been paid' 
      });
    }

    // Convert total price to cents (Stripe uses smallest currency unit)
    const totalPrice = parseFloat(order.totalPrice);
    if (isNaN(totalPrice) || totalPrice <= 0) {
      console.error('Invalid order total price:', order.totalPrice);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order total price' 
      });
    }
    // Stripe minimum amount (USD): 50 cents
    const amountInCents = Math.max(50, Math.round(totalPrice * 100));
    console.log('Payment amount:', totalPrice, 'USD =', amountInCents, 'cents');

    // Create or retrieve payment intent
    let paymentIntent;
    if (order.paymentIntentId) {
      // Retrieve existing payment intent
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        
        // If payment intent is already succeeded, return it
        if (paymentIntent.status === 'succeeded') {
          await order.update({
            paymentStatus: 'succeeded',
            paidAt: new Date()
          });
          return res.json({ 
            success: true, 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          });
        }
      } catch (error) {
        // If payment intent doesn't exist, create a new one
        console.log('Payment intent not found, creating new one');
      }
    }

    // Create new payment intent if needed
    if (!paymentIntent) {
      try {
        console.log('Creating new payment intent with Stripe...');
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          metadata: {
            orderId: String(order.id),
            buyerId: String(order.buyerId),
            farmerId: String(order.farmerId)
          },
          automatic_payment_methods: {
            enabled: true
          }
        });
        console.log('Payment intent created:', paymentIntent.id);

        // Update order with payment intent ID
        try {
          await order.update({
            paymentIntentId: paymentIntent.id,
            paymentAmount: order.totalPrice,
            paymentStatus: 'processing'
          });
          console.log('Order updated with payment intent ID');
        } catch (updateError) {
          console.error('Error updating order with payment intent:', updateError);
          // Continue even if update fails - payment intent is created
        }
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment. Please try again.',
          error: stripeError.message
        });
      }
    }

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment after successful payment
// @access  Private
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment intent ID and order ID are required' 
      });
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find the order
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user is the buyer
    if (String(order.buyerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Verify payment intent matches order
    if (order.paymentIntentId !== paymentIntentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment intent does not match order' 
      });
    }

    // Update order based on payment status
    if (paymentIntent.status === 'succeeded') {
      await order.update({
        paymentStatus: 'succeeded',
        paidAt: new Date(),
        paymentMethod: paymentIntent.payment_method_types[0] || 'card'
      });

      // Load associations for notification context
      const populatedOrder = await Order.findByPk(order.id, {
        include: [
          { model: Product, as: 'product', attributes: ['id', 'name'] },
          { model: User, as: 'farmer', attributes: ['id', 'name'] },
          { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] }
        ]
      });
      // Notify buyer via email/notification (ignore errors)
      notifyPaymentSucceeded(populatedOrder).catch(() => {});

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        order
      });
    } else if (paymentIntent.status === 'processing') {
      await order.update({
        paymentStatus: 'processing'
      });

      res.json({
        success: true,
        message: 'Payment is processing',
        order
      });
    } else {
      await order.update({
        paymentStatus: 'failed'
      });

      res.status(400).json({
        success: false,
        message: `Payment ${paymentIntent.status}`,
        order
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhook events
// @access  Public (Stripe will call this)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntentSucceeded.id);
      
      // Find order by payment intent ID
      const orderSucceeded = await Order.findOne({
        where: { paymentIntentId: paymentIntentSucceeded.id }
      });

      if (orderSucceeded) {
        await orderSucceeded.update({
          paymentStatus: 'succeeded',
          paidAt: new Date(),
          paymentMethod: paymentIntentSucceeded.payment_method_types[0] || 'card'
        });
        console.log('Order payment status updated to succeeded:', orderSucceeded.id);

        // Send notification/email to buyer
        try {
          const populatedOrder = await Order.findByPk(orderSucceeded.id, {
            include: [
              { model: Product, as: 'product', attributes: ['id', 'name'] },
              { model: User, as: 'farmer', attributes: ['id', 'name'] },
              { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] }
            ]
          });
          notifyPaymentSucceeded(populatedOrder).catch(() => {});
        } catch (nErr) {
          console.error('Error sending payment succeeded notification:', nErr);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('PaymentIntent failed:', paymentIntentFailed.id);
      
      const orderFailed = await Order.findOne({
        where: { paymentIntentId: paymentIntentFailed.id }
      });

      if (orderFailed) {
        await orderFailed.update({
          paymentStatus: 'failed'
        });
        console.log('Order payment status updated to failed:', orderFailed.id);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// @route   GET /api/payments/status/:orderId
// @desc    Get payment status for an order
// @access  Private
router.get('/status/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the user is the buyer or farmer
    if (String(order.buyerId) !== String(req.user.id) && 
        String(order.farmerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let paymentIntent = null;
    if (order.paymentIntentId) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
      }
    }

    res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      paymentIntentId: order.paymentIntentId,
      paymentAmount: order.paymentAmount,
      paidAt: order.paidAt,
      paymentIntent: paymentIntent ? {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      } : null
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

