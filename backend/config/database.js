const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'marketplace';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

// First, connect to the default 'postgres' database to create our database if it doesn't exist
const adminSequelize = new Sequelize('postgres', dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false,
});

// Function to ensure database exists
async function ensureDatabaseExists() {
  try {
    await adminSequelize.authenticate();
    console.log('✅ Connected to PostgreSQL server');
    
    // Check if database exists
    const [results] = await adminSequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
    );
    
    if (results.length === 0) {
      console.log(`📦 Database '${dbName}' does not exist. Creating it...`);
      await adminSequelize.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }
    
    await adminSequelize.close();
  } catch (error) {
    console.error('❌ Error ensuring database exists:', error.message);
    // Don't throw - let the main connection attempt handle the error
  }
}

// Ensure database exists before creating the main connection
if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseExists().catch(console.error);
}

// Main Sequelize instance for the application
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3
  }
});

module.exports = sequelize;

