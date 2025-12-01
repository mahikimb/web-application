const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'buyer_id'
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
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    field: 'product_id'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  deliveryAddress: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'delivery_address'
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'contact_phone'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  farmerNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'farmer_notes'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },
  cancelledBy: {
    type: DataTypes.ENUM('buyer', 'farmer'),
    allowNull: true,
    field: 'cancelled_by'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded'),
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_intent_id'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'payment_amount'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_method'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at'
  },
  estimatedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'estimated_delivery_date'
  },
  actualDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_delivery_date'
  },
  statusHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'status_history'
  },
  scheduledDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_delivery_date'
  },
  deliveryCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'delivery_cost'
  },
  deliveryStatus: {
    type: DataTypes.ENUM('pending', 'scheduled', 'in_transit', 'out_for_delivery', 'delivered', 'failed'),
    defaultValue: 'pending',
    field: 'delivery_status'
  },
  deliveryService: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'delivery_service'
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'tracking_number'
  },
  deliveryAddressId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'delivery_addresses',
      key: 'id'
    },
    field: 'delivery_address_id',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      fields: ['buyer_id']
    },
    {
      fields: ['farmer_id']
    },
    {
      fields: ['product_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Order;
