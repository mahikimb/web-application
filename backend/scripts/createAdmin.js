/**
 * Script to create an admin user
 * 
 * Usage: node scripts/createAdmin.js
 * Or with custom values: node scripts/createAdmin.js "Admin Name" "admin@example.com" "1234567890" "password123"
 */

require('dotenv').config();
const { User } = require('../models');
const sequelize = require('../config/database');

async function createAdmin() {
  try {
    // Get command line arguments or use defaults
    const name = process.argv[2] || 'Admin User';
    const email = process.argv[3] || 'admin@example.com';
    const phone = process.argv[4] || '1234567890';
    const password = process.argv[5] || 'admin123';

    console.log('🔐 Creating admin user...');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phone}`);
    console.log(`Password: ${password}`);
    console.log('');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ email }, { phone }]
      }
    });

    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️  Admin user already exists with this email or phone');
        console.log(`   User ID: ${existingAdmin.id}`);
        console.log(`   Current role: ${existingAdmin.role}`);
        console.log('');
        console.log('💡 To change role to admin, use the admin dashboard or update the database directly.');
        process.exit(0);
      } else {
        // Update existing user to admin
        await existingAdmin.update({ role: 'admin' });
        console.log('✅ Updated existing user to admin role');
        console.log(`   User ID: ${existingAdmin.id}`);
        process.exit(0);
      }
    }

    // Create new admin user
    const admin = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('🎉 You can now login with these credentials to access the admin dashboard!');
    console.log(`   URL: http://localhost:5173/admin`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createAdmin();

