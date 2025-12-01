const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  farmerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'farmer_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  category: {
    type: DataTypes.ENUM('vegetables', 'fruits', 'grains', 'dairy', 'poultry', 'herbs', 'other'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  unit: {
    type: DataTypes.ENUM('kg', 'lb', 'piece', 'dozen', 'bunch', 'bag'),
    allowNull: false
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  farmLocation: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'farm_location'
  },
  harvestDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'harvest_date'
  },
  qualityNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'quality_notes'
  },
  isOrganic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_organic'
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved'
  },
  status: {
    type: DataTypes.ENUM('active', 'sold_out', 'inactive'),
    defaultValue: 'active'
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    field: 'average_rating',
    validate: {
      min: 0,
      max: 5
    }
  },
  totalReviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_reviews'
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['category', 'status', 'is_approved']
    },
    {
      fields: ['farmer_id']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = Product;
