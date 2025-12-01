const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WishlistItem = sequelize.define('WishlistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wishlistId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'wishlists',
      key: 'id'
    },
    onDelete: 'CASCADE',
    field: 'wishlist_id'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    field: 'product_id'
  },
  addedAtPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'added_at_price'
  },
  currentPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'current_price'
  },
  priceDropAlert: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'price_drop_alert'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'wishlist_items',
  timestamps: true,
  indexes: [
    {
      fields: ['wishlist_id']
    },
    {
      fields: ['product_id']
    },
    {
      unique: true,
      fields: ['wishlist_id', 'product_id']
    }
  ]
});

module.exports = WishlistItem;

