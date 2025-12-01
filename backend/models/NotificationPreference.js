const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  emailNewOrder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_new_order'
  },
  emailOrderConfirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_order_confirmed'
  },
  emailOrderCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_order_completed'
  },
  emailOrderCancelled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_order_cancelled'
  },
  emailNewProduct: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_new_product'
  },
  emailPriceDrop: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_price_drop'
  },
  emailNewReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_new_review'
  },
  emailNewMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_new_message'
  },
  pushNewOrder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_new_order'
  },
  pushOrderConfirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_order_confirmed'
  },
  pushOrderCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_order_completed'
  },
  pushOrderCancelled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_order_cancelled'
  },
  pushNewProduct: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_new_product'
  },
  pushPriceDrop: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_price_drop'
  },
  pushNewReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_new_review'
  },
  pushNewMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_new_message'
  }
}, {
  tableName: 'notification_preferences',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    }
  ]
});

module.exports = NotificationPreference;

