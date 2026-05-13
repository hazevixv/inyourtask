/**
 * Add Missing Columns to Users Table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    console.log('📋 Adding missing columns to users table...\n');

    const columnsToAdd = [
      { 
        name: 'job_position', 
        sql: 'ALTER TABLE users ADD COLUMN job_position VARCHAR(255) NULL AFTER email',
        after: 'email'
      },
      { 
        name: 'organization', 
        sql: 'ALTER TABLE users ADD COLUMN organization VARCHAR(255) NULL AFTER job_position',
        after: 'job_position'
      },
      { 
        name: 'avatar', 
        sql: 'ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER organization',
        after: 'organization'
      },
      { 
        name: 'bio', 
        sql: 'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER avatar',
        after: 'avatar'
      },
      { 
        name: 'phone', 
        sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER bio',
        after: 'bio'
      }
    ];

    for (const col of columnsToAdd) {
      try {
        // Check if column exists
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
          [dbConfig.database, col.name]
        );
        
        if (columns.length === 0) {
          await connection.execute(col.sql);
          console.log(`   ✅ Added column: ${col.name}`);
        } else {
          console.log(`   ✓ Column already exists: ${col.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error adding ${col.name}: ${err.message}`);
      }
    }

    console.log('\n🎉 SUCCESS! All columns added!');

    // Show final structure
    console.log('\n📋 Final users table structure:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
