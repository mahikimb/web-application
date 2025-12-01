const { Notification, NotificationPreference, User, Follow } = require('../models');
const nodemailer = require('nodemailer');

// Email transporter setup
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  console.warn('⚠️  Email configuration not found. Email notifications will be disabled.');
}

// Generic system email sender (non-notification emails like password reset)
const sendSystemEmail = async (to, subject, html) => {
  if (!transporter || !to) {
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error('Error sending system email:', err);
    return false;
  }
};

// Socket.io instance (will be set from server.js)
let io = null;

const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

// Get or create notification preferences
const getNotificationPreferences = async (userId) => {
  let preferences = await NotificationPreference.findOne({ where: { userId } });
  if (!preferences) {
    preferences = await NotificationPreference.create({ userId });
  }
  return preferences;
};

// Send email notification
const sendEmailNotification = async (user, notification) => {
  if (!transporter || !user.email) {
    return false;
  }

  try {
    const preferences = await getNotificationPreferences(user.id);
    
    // Map notification types to preference field names
    const emailFieldMap = {
      'new_order': 'emailNewOrder',
      'order_confirmed': 'emailOrderConfirmed',
      'order_completed': 'emailOrderCompleted',
      'order_cancelled': 'emailOrderCancelled',
      'payment_succeeded': 'emailOrderConfirmed',
      'new_product': 'emailNewProduct',
      'price_drop': 'emailPriceDrop',
      'new_review': 'emailNewReview',
      'new_message': 'emailNewMessage'
    };
    
    const emailField = emailFieldMap[notification.type];
    
    // Check if email is enabled for this notification type (default to true if field doesn't exist)
    if (emailField && preferences[emailField] === false) {
      return false;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">${notification.title}</h2>
          <p style="color: #333; line-height: 1.6;">${notification.message}</p>
          ${notification.data.url ? `<a href="${notification.data.url}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">View Details</a>` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">You're receiving this email because you have email notifications enabled for this type of update.</p>
        </div>
      `
    });

    // Mark notification as email sent
    await notification.update({ emailSent: true });
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

// Send real-time notification via WebSocket
const sendRealtimeNotification = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

// Create and send notification
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.error(`User ${userId} not found for notification`);
      return null;
    }

    // Create notification
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data
    });

    // Get preferences
    const preferences = await getNotificationPreferences(userId);

    // Map notification types to preference field names
    const pushFieldMap = {
      'new_order': 'pushNewOrder',
      'order_confirmed': 'pushOrderConfirmed',
      'order_completed': 'pushOrderCompleted',
      'order_cancelled': 'pushOrderCancelled',
      'payment_succeeded': 'pushOrderConfirmed',
      'new_product': 'pushNewProduct',
      'price_drop': 'pushPriceDrop',
      'new_review': 'pushNewReview',
      'new_message': 'pushNewMessage'
    };

    // Send real-time notification if enabled
    const pushField = pushFieldMap[type];
    if (pushField && preferences[pushField] !== false) {
      sendRealtimeNotification(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });
    }

    // Send email notification (async, don't wait)
    sendEmailNotification(user, notification).catch(err => {
      console.error('Error sending email notification:', err);
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Notification helpers for specific events
const notifyNewOrder = async (order) => {
  const farmer = await User.findByPk(order.farmerId);
  if (farmer) {
    await createNotification(
      order.farmerId,
      'new_order',
      'New Order Received',
      `You have a new order for ${order.product?.name || 'a product'} from ${order.buyer?.name || 'a buyer'}`,
      {
        orderId: order.id,
        productId: order.productId,
        buyerId: order.buyerId,
        url: `/orders`
      }
    );
  }
};

const notifyOrderStatusUpdate = async (order, status) => {
  const buyer = await User.findByPk(order.buyerId);
  if (buyer) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      completed: 'Your order has been completed',
      cancelled: 'Your order has been cancelled'
    };

    await createNotification(
      order.buyerId,
      `order_${status}`,
      `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `${statusMessages[status]} for ${order.product?.name || 'your product'}`,
      {
        orderId: order.id,
        productId: order.productId,
        farmerId: order.farmerId,
        url: `/orders`
      }
    );
  }
};

const notifyNewProduct = async (product) => {
  // Notify followers of the farmer
  const followers = await Follow.findAll({
    where: { followingId: product.farmerId },
    include: [{ model: User, as: 'follower' }]
  });

  for (const follow of followers) {
    await createNotification(
      follow.followerId,
      'new_product',
      'New Product from Followed Farmer',
      `${product.farmer?.name || 'A farmer'} has added a new product: ${product.name}`,
      {
        productId: product.id,
        farmerId: product.farmerId,
        url: `/products/${product.id}`
      }
    );
  }
};

const notifyPriceDrop = async (wishlistItem, oldPrice, newPrice) => {
  const { Wishlist } = require('../models');
  const wishlist = await Wishlist.findByPk(wishlistItem.wishlistId);
  const user = await User.findByPk(wishlist.userId);
  const { Product } = require('../models');
  const product = await Product.findByPk(wishlistItem.productId);

  if (user && product) {
    const priceDrop = parseFloat(oldPrice) - parseFloat(newPrice);
    const percentage = ((priceDrop / parseFloat(oldPrice)) * 100).toFixed(2);

    await createNotification(
      user.id,
      'price_drop',
      'Price Drop Alert!',
      `${product.name} price dropped by $${priceDrop.toFixed(2)} (${percentage}% off)`,
      {
        productId: product.id,
        wishlistItemId: wishlistItem.id,
        oldPrice,
        newPrice,
        url: `/products/${product.id}`
      }
    );
  }
};

// Notify buyer that their payment was successful
const notifyPaymentSucceeded = async (order) => {
  const buyer = await User.findByPk(order.buyerId);
  if (!buyer) return;
  await createNotification(
    order.buyerId,
    'payment_succeeded',
    'Payment Received',
    `Your payment for ${order.product?.name || 'your order'} was successful. Order ID: ${order.id}.`,
    {
      orderId: order.id,
      productId: order.productId,
      farmerId: order.farmerId,
      url: `/orders`
    }
  );
};

module.exports = {
  setSocketIO,
  createNotification,
  notifyNewOrder,
  notifyOrderStatusUpdate,
  notifyNewProduct,
  notifyPriceDrop,
  getNotificationPreferences,
  notifyPaymentSucceeded,
  sendSystemEmail
};

