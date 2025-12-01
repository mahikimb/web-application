const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliveryAddress = sequelize.define('DeliveryAddress', {
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
    field: 'user_id',
    onDelete: 'CASCADE'
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Home'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'zip_code'
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'USA',
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  }
}, {
  tableName: 'delivery_addresses',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['is_default']
    }
  ]
});

module.exports = DeliveryAddress;

