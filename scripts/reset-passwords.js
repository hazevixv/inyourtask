/**
 * Reset all user passwords to raytask123
 */
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function resetPasswords() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'raytask',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Generate bcrypt hash for raytask123
    const newPassword = 'raytask123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Verify hash works
    const verify = await bcrypt.compare(newPassword, hash);
    console.log('✅ Hash verification:', verify);
    console.log('✅ New hash:', hash);

    // Update all users
    const [result] = await conn.execute(
      'UPDATE users SET password = ?',
      [hash]
    );
    
    console.log(`✅ Updated ${result.affectedRows} users`);
    console.log('');
    console.log('🎉 All passwords reset to: raytask123');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username: taufik');
    console.log('  Password: raytask123');
    console.log('');
    console.log('  Username: admin');
    console.log('  Password: raytask123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

resetPasswords();
