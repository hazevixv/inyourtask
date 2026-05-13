const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTaskFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🔄 Adding new fields to tasks table...');

    // Check and add notes column
    try {
      await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN notes TEXT NULL AFTER due_date
      `);
      console.log('✅ Added notes column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  notes column already exists');
      } else {
        throw err;
      }
    }

    // Check and add url column
    try {
      await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN url TEXT NULL AFTER notes
      `);
      console.log('✅ Added url column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  url column already exists');
      } else {
        throw err;
      }
    }

    // Check and add brief column
    try {
      await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN brief TEXT NULL AFTER url
      `);
      console.log('✅ Added brief column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  brief column already exists');
      } else {
        throw err;
      }
    }

    // Set default version to v1 for existing tasks
    await connection.execute(`
      UPDATE tasks 
      SET version = 1 
      WHERE version IS NULL OR version = 0
    `);
    console.log('✅ Set default version to v1 for existing tasks');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addTaskFields().catch(console.error);
