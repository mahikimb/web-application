const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');
const Review = require('./Review');
const Message = require('./Message');
const Wishlist = require('./Wishlist');
const WishlistItem = require('./WishlistItem');
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');
const Follow = require('./Follow');
const DeliveryAddress = require('./DeliveryAddress');

// Define associations
User.hasMany(Product, { foreignKey: 'farmerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

User.hasMany(Order, { foreignKey: 'buyerId', as: 'buyerOrders' });
User.hasMany(Order, { foreignKey: 'farmerId', as: 'farmerOrders' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });

User.hasMany(Review, { foreignKey: 'buyerId', as: 'buyerReviews' });
User.hasMany(Review, { foreignKey: 'farmerId', as: 'farmerReviews' });
Review.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Review.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
Order.hasOne(Review, { foreignKey: 'orderId', as: 'review' });

// Message associations
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
Message.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Message.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Order.hasMany(Message, { foreignKey: 'orderId', as: 'messages' });
Product.hasMany(Message, { foreignKey: 'productId', as: 'messages' });

// Wishlist associations
User.hasMany(Wishlist, { foreignKey: 'userId', as: 'wishlists' });
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlistId', as: 'items', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlistId', as: 'wishlist' });

WishlistItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(WishlistItem, { foreignKey: 'productId', as: 'wishlistItems' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(NotificationPreference, { foreignKey: 'userId', as: 'notificationPreferences' });
NotificationPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Follow associations
User.hasMany(Follow, { foreignKey: 'followerId', as: 'following' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers' });
Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
Follow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

// Delivery Address associations (only if DeliveryAddress model exists)
try {
  User.hasMany(DeliveryAddress, { foreignKey: 'userId', as: 'deliveryAddresses' });
  DeliveryAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  // Use a distinct alias to avoid clashing with Order.deliveryAddress JSONB column
  Order.belongsTo(DeliveryAddress, { foreignKey: 'deliveryAddressId', as: 'deliveryAddressRef' });
  DeliveryAddress.hasMany(Order, { foreignKey: 'deliveryAddressId', as: 'orders' });
} catch (assocError) {
  console.warn('Warning: Could not set up DeliveryAddress associations:', assocError.message);
}

module.exports = {
  User,
  Product,
  Order,
  Review,
  Message,
  Wishlist,
  WishlistItem,
  Notification,
  NotificationPreference,
  Follow,
  DeliveryAddress
};

