/**
 * Set Taufan Password Script
 * Generate bcrypt hash and update database
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Configuration
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '', // Your MySQL root password
  database: 'ray-task_management'
};

// Password to set (CHANGE THIS!)
const NEW_PASSWORD = 'taufan123'; // Change to desired password

async function setPassword() {
  let connection;
  
  try {
    console.log('🔐 Generating password hash...');
    
    // Generate bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    
    console.log('✅ Password hash generated');
    console.log('📝 Hash:', hashedPassword);
    console.log('');
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database');
    console.log('');
    
    // Update taufan password
    console.log('💾 Updating taufan password...');
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, 'taufan']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Password updated successfully!');
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('📋 Login Credentials:');
      console.log('   Username: taufan');
      console.log('   Password:', NEW_PASSWORD);
      console.log('═══════════════════════════════════════');
      console.log('');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log('⚠️  No user found with username "taufan"');
      console.log('   Make sure to run UPDATE-USERS-DATA.sql first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Tips:');
      console.error('   - Make sure MySQL server is running');
      console.error('   - Check DB_CONFIG in this script');
      console.error('   - Verify database credentials');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }
}

// Run
console.log('');
console.log('═══════════════════════════════════════');
console.log('🚀 Set Taufan Password Script');
console.log('═══════════════════════════════════════');
console.log('');

setPassword();
