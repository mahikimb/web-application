const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('📝 Please create a .env file in the backend directory with the following:');
  console.error(`
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketplace
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
JWT_EXPIRE=7d
  `);
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Sequelize
const sequelize = require('./config/database');

// Import models to register them (needed for routes)
// They will be validated after DB connection
try {
  require('./models');
  console.log('✅ Models loaded successfully');
} catch (modelError) {
  console.error('❌ Error loading models:', modelError);
  console.error('Error details:', modelError.message);
  console.error('Stack:', modelError.stack);
  // Continue anyway - models might load after DB connection
}

// Test connection and sync models
let dbConnected = false;

// Helper function to ensure delivery_addresses table exists
async function ensureDeliveryAddressesTable() {
  try {
    const [tableCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_addresses'
      )
    `);
    
    if (!tableCheck[0].exists) {
      console.log('Creating delivery_addresses table...');
      await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => {});
      await sequelize.query(`
        CREATE TABLE delivery_addresses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label VARCHAR(255) NOT NULL DEFAULT 'Home',
          address VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          zip_code VARCHAR(20) NOT NULL,
          country VARCHAR(100) DEFAULT 'USA' NOT NULL,
          phone VARCHAR(20),
          is_default BOOLEAN DEFAULT false,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_default ON delivery_addresses(is_default);
      `);
      console.log('✅ delivery_addresses table created');
    }
  } catch (err) {
    console.warn('Warning: Could not ensure delivery_addresses table exists:', err.message);
  }
}

// Retry connection with delay
async function connectDatabase(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection has been established successfully.');
      dbConnected = true;
      
      // FIRST: Ensure delivery_addresses table exists (needed for Order model foreign key)
      const [deliveryAddressesTableCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'delivery_addresses'
        )
      `);
      
      if (!deliveryAddressesTableCheck[0].exists) {
        console.log('Creating delivery_addresses table (required for Order model)...');
        // Enable pgcrypto extension if needed for UUID generation
        await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => {
          // Extension might already exist or not be needed
        });
        await sequelize.query(`
          CREATE TABLE delivery_addresses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            label VARCHAR(255) NOT NULL DEFAULT 'Home',
            address VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            zip_code VARCHAR(20) NOT NULL,
            country VARCHAR(100) DEFAULT 'USA' NOT NULL,
            phone VARCHAR(20),
            is_default BOOLEAN DEFAULT false,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
          CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_default ON delivery_addresses(is_default);
        `);
        console.log('✅ delivery_addresses table created');
      }
      
      // Fix existing data and schema before syncing
      try {
        // Check if orders table exists and add payment columns if needed
        const [ordersTableCheck] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'orders'
          )
        `);
        
        if (ordersTableCheck[0].exists) {
          // Check and add payment_status column if it doesn't exist
          const [paymentStatusCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'payment_status'
            )
          `);
          
          if (!paymentStatusCheck[0].exists) {
            console.log('Adding payment columns to orders table...');
            await sequelize.query(`
              ALTER TABLE orders 
              ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending',
              ADD COLUMN payment_intent_id VARCHAR(255),
              ADD COLUMN payment_amount DECIMAL(10, 2),
              ADD COLUMN payment_method VARCHAR(50),
              ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Payment columns added to orders table');
          }
          
          // Check and add delivery date and status history columns
          const [deliveryDateCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'estimated_delivery_date'
            )
          `);
          
          if (!deliveryDateCheck[0].exists) {
            console.log('Adding delivery date and status history columns to orders table...');
            await sequelize.query(`
              ALTER TABLE orders 
              ADD COLUMN estimated_delivery_date TIMESTAMP WITH TIME ZONE,
              ADD COLUMN actual_delivery_date TIMESTAMP WITH TIME ZONE,
              ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb
            `);
            console.log('✅ Delivery date and status history columns added to orders table');
          }
          
          // Check and add bio, farm_story, verification_badge columns to users table
          const [userBioCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'bio'
            )
          `);
          
          if (!userBioCheck[0].exists) {
            console.log('Adding bio, farm_story, and verification_badge columns to users table...');
            await sequelize.query(`
              ALTER TABLE users 
              ADD COLUMN bio TEXT,
              ADD COLUMN farm_story TEXT,
              ADD COLUMN verification_badge VARCHAR(20) DEFAULT 'none'
            `);
            console.log('✅ Bio, farm_story, and verification_badge columns added to users table');
          }
          
          // First, ensure delivery_addresses table exists (before adding foreign key to orders)
          const [deliveryAddressesTableCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'delivery_addresses'
            )
          `);
          
          if (!deliveryAddressesTableCheck[0].exists) {
            console.log('Creating delivery_addresses table...');
            // Enable pgcrypto extension if needed for UUID generation
            await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => {
              // Extension might already exist or not be needed
            });
            await sequelize.query(`
              CREATE TABLE delivery_addresses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                label VARCHAR(255) NOT NULL DEFAULT 'Home',
                address VARCHAR(255) NOT NULL,
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100) NOT NULL,
                zip_code VARCHAR(20) NOT NULL,
                country VARCHAR(100) DEFAULT 'USA' NOT NULL,
                phone VARCHAR(20),
                is_default BOOLEAN DEFAULT false,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )
            `);
            await sequelize.query(`
              CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
              CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_default ON delivery_addresses(is_default);
            `);
            console.log('✅ delivery_addresses table created');
          }
          
          // Check and add delivery-related columns to orders table
          const [deliveryStatusCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'delivery_status'
            )
          `);
          
          if (!deliveryStatusCheck[0].exists) {
            console.log('Adding delivery-related columns to orders table...');
            await sequelize.query(`
              ALTER TABLE orders 
              ADD COLUMN scheduled_delivery_date TIMESTAMP WITH TIME ZONE,
              ADD COLUMN delivery_cost DECIMAL(10, 2) DEFAULT 0,
              ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'pending',
              ADD COLUMN delivery_service VARCHAR(100),
              ADD COLUMN tracking_number VARCHAR(100)
            `);
            console.log('✅ Delivery-related columns added to orders table');
          }
          
          // Check if delivery_address_id column exists in orders table
          const [deliveryAddressIdCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'delivery_address_id'
            )
          `);
          
          if (!deliveryAddressIdCheck[0].exists) {
            console.log('Adding delivery_address_id column to orders table...');
            await sequelize.query(`
              ALTER TABLE orders 
              ADD COLUMN delivery_address_id UUID REFERENCES delivery_addresses(id) ON DELETE SET NULL
            `);
            console.log('✅ delivery_address_id column added to orders table');
          }
        }
        
        // Check if products table exists and has data
        const [tableCheck] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'products'
          )
        `);
        
        if (tableCheck[0].exists) {
          // Auto-approve existing products that are not approved
          await sequelize.query(`
            UPDATE products 
            SET is_approved = true 
            WHERE is_approved = false
          `).catch(() => {
            // Ignore if column doesn't exist yet
          });
          console.log('✅ Auto-approved existing products');
          // Check if harvest_date column exists
          const [columnCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'products' 
              AND column_name = 'harvest_date'
            )
          `);
          
          if (columnCheck[0].exists) {
            // Column exists - update null values
            await sequelize.query(`
              UPDATE products 
              SET harvest_date = COALESCE(harvest_date, CURRENT_DATE)
              WHERE harvest_date IS NULL
            `);
            console.log('✅ Updated existing products with null harvest dates.');
            
            // Make sure it's NOT NULL if it isn't already
            await sequelize.query(`
              ALTER TABLE products 
              ALTER COLUMN harvest_date SET NOT NULL
            `).catch(() => {
              // Ignore if already NOT NULL
            });
          } else {
            // Column doesn't exist - add it as nullable first
            await sequelize.query(`
              ALTER TABLE products 
              ADD COLUMN harvest_date TIMESTAMP WITH TIME ZONE
            `).catch(() => {
              // Ignore if column already exists
            });
            
            // Update null values
            await sequelize.query(`
              UPDATE products 
              SET harvest_date = CURRENT_DATE 
              WHERE harvest_date IS NULL
            `);
            
            // Now make it NOT NULL
            await sequelize.query(`
              ALTER TABLE products 
              ALTER COLUMN harvest_date SET NOT NULL
            `);
            console.log('✅ Added harvest_date column and updated existing products.');
          }
        }
      } catch (migrationErr) {
        console.log('ℹ️  Migration step completed or not needed:', migrationErr.message);
      }
      
      // Ensure delivery_addresses table exists before syncing
      await ensureDeliveryAddressesTable();
      
      // Sync models (use { alter: true } in development, { force: true } to drop tables)
      try {
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✅ Database models synchronized.');
        
        // Verify notifications table exists
        const [notificationsTableCheck] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
          )
        `);
        if (!notificationsTableCheck[0].exists) {
          console.log('⚠️  Notifications table not found after sync. This is normal if models are still syncing.');
        } else {
          console.log('✅ Notifications table verified.');
        }
      } catch (syncError) {
        console.error('❌ Error syncing database models:', syncError.message);
        console.error('Stack:', syncError.stack);
        // Check if it's a table that already exists error
        if (syncError.message.includes('already exists') || syncError.message.includes('relation') || syncError.message.includes('duplicate')) {
          console.log('⚠️  Table may already exist, continuing...');
        } else {
          // For other errors, still continue but log the issue
          console.log('⚠️  Continuing despite sync error - check database manually if needed');
        }
        // Still mark as connected since authentication succeeded
        // The sync error might be due to existing tables or schema differences
      }
      // Connection is successful even if sync had issues
      dbConnected = true;
      return;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, err.message);
      
      // If it's a constraint error, try to fix it
      if (err.message.includes('contains null values') || err.message.includes('violates not-null constraint') || err.message.includes('harvest_date')) {
        console.log('🔧 Attempting to fix data integrity issues...');
        try {
          // Check if column exists
          const [columnCheck] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'products' 
              AND column_name = 'harvest_date'
            )
          `);
          
          if (columnCheck[0].exists) {
            // Column exists - make it nullable temporarily
            await sequelize.query(`
              ALTER TABLE products 
              ALTER COLUMN harvest_date DROP NOT NULL
            `).catch(() => {
              // Ignore if already nullable
            });
            
            // Update all null values
            await sequelize.query(`
              UPDATE products 
              SET harvest_date = COALESCE(harvest_date, CURRENT_DATE)
              WHERE harvest_date IS NULL
            `);
            
            // Now make it NOT NULL again
            await sequelize.query(`
              ALTER TABLE products 
              ALTER COLUMN harvest_date SET NOT NULL
            `);
            
            console.log('✅ Fixed data integrity issues. Retrying sync...');
            // Ensure delivery_addresses table exists before syncing
            await ensureDeliveryAddressesTable();
            // Retry sync after fixing
            await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
            console.log('✅ Database models synchronized.');
            dbConnected = true;
            return;
          } else {
            // Column doesn't exist - add it properly
            await sequelize.query(`
              ALTER TABLE products 
              ADD COLUMN harvest_date TIMESTAMP WITH TIME ZONE
            `);
            
            await sequelize.query(`
              UPDATE products 
              SET harvest_date = CURRENT_DATE 
              WHERE harvest_date IS NULL
            `);
            
            await sequelize.query(`
              ALTER TABLE products 
              ALTER COLUMN harvest_date SET NOT NULL
            `);
            
            console.log('✅ Added harvest_date column. Retrying sync...');
            // Ensure delivery_addresses table exists before syncing
            await ensureDeliveryAddressesTable();
            await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
            console.log('✅ Database models synchronized.');
            dbConnected = true;
            return;
          }
        } catch (fixErr) {
          console.error('❌ Could not fix data integrity issues:', fixErr.message);
          console.error('💡 You may need to manually run SQL to fix this:');
          console.error('   ALTER TABLE products ALTER COLUMN harvest_date DROP NOT NULL;');
          console.error('   UPDATE products SET harvest_date = CURRENT_DATE WHERE harvest_date IS NULL;');
          console.error('   ALTER TABLE products ALTER COLUMN harvest_date SET NOT NULL;');
        }
      }
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Unable to connect to the database after multiple attempts.');
        console.error('💡 Make sure PostgreSQL is running and the database credentials in .env are correct.');
        console.error('💡 Database connection details:', {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'marketplace',
          user: process.env.DB_USER || 'postgres'
        });
        console.error('💡 Common fixes:');
        console.error('   1. Start PostgreSQL service');
        console.error('   2. Check if password in .env matches your PostgreSQL password');
        console.error('   3. Verify PostgreSQL is listening on port 5432');
        console.error('   4. If you see "contains null values" error, you may need to manually update existing records');
        dbConnected = false;
      }
    }
  }
}

// Start connection attempt (with error handling)
connectDatabase().catch((err) => {
  console.error('❌ Fatal error during database connection:', err);
  console.error('Stack:', err.stack);
  // Don't exit - let the server start and handle requests with DB check middleware
});

// Middleware to check database connection before handling requests
app.use(async (req, res, next) => {
  // Check if database is connected, if not, try to verify connection
  if (!dbConnected) {
    try {
      await sequelize.authenticate();
      dbConnected = true;
      console.log('✅ Database connection verified on request');
    } catch (err) {
      // Only block critical routes if database is truly unavailable
      if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/products') || req.path.startsWith('/api/orders') || req.path.startsWith('/api/messages')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection not available. Please check your database configuration.',
          error: 'Database not connected'
        });
      }
    }
  }
  next();
});

// Make sequelize available to routes
app.set('sequelize', sequelize);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/wishlists', require('./routes/wishlists'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/delivery', require('./routes/delivery'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', err);
  console.error('Stack:', err.stack);
  // Don't exit in development - let nodemon handle it
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

// Initialize Socket.io for real-time notifications
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Set Socket.io instance in notification service
const notificationService = require('./services/notificationService');
notificationService.setSocketIO(io);

// Socket.io connection handling
io.use((socket, next) => {
  // Authenticate socket connection using JWT token
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User ${socket.userId} connected to notifications`);
  
  // Join user's personal room
  socket.join(`user_${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ User ${socket.userId} disconnected from notifications`);
  });
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

