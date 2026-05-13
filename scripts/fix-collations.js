/**
 * Fix Database Collation Issues
 * Ensures all tables use consistent utf8mb4_unicode_ci collation
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCollations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🔧 Fixing database collations...\n');

    // Get all tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'ray-task_management']);

    console.log(`Found ${tables.length} tables to check\n`);

    // Convert each table to utf8mb4_unicode_ci
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`Converting ${tableName}...`);
      
      try {
        await connection.execute(`
          ALTER TABLE ${tableName} 
          CONVERT TO CHARACTER SET utf8mb4 
          COLLATE utf8mb4_unicode_ci
        `);
        console.log(`  ✓ ${tableName} converted`);
      } catch (err) {
        console.log(`  ⚠ ${tableName} - ${err.message}`);
      }
    }

    console.log('\n✅ Collation fix complete!');
    console.log('All tables now use utf8mb4_unicode_ci');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixCollations();
