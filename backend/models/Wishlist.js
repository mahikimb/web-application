const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'My Wishlist'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  shareToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'share_token'
  }
}, {
  tableName: 'wishlists',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['share_token']
    }
  ]
});

module.exports = Wishlist;

