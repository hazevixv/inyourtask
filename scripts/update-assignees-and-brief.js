const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAssigneesAndBrief() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🔄 Updating tasks and projects schema...');

    // 1. Change tasks.assignee to assignees (TEXT for multiple)
    console.log('📝 Updating tasks.assignee to assignees...');
    
    // Rename column
    try {
      await connection.execute(`
        ALTER TABLE tasks 
        CHANGE COLUMN assignee assignees TEXT NULL
      `);
      console.log('✅ Renamed tasks.assignee to assignees');
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️  Column already renamed or does not exist');
      } else {
        throw err;
      }
    }

    // 2. Add url and brief to projects
    console.log('📝 Adding url and brief to projects...');
    
    try {
      await connection.execute(`
        ALTER TABLE projects 
        ADD COLUMN url TEXT NULL AFTER notes
      `);
      console.log('✅ Added url column to projects');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  url column already exists in projects');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE projects 
        ADD COLUMN brief TEXT NULL AFTER url
      `);
      console.log('✅ Added brief column to projects');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  brief column already exists in projects');
      } else {
        throw err;
      }
    }

    // 3. Set default version to v1 for projects
    await connection.execute(`
      UPDATE projects 
      SET version = 1 
      WHERE version IS NULL OR version = 0
    `);
    console.log('✅ Set default version to v1 for existing projects');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateAssigneesAndBrief().catch(console.error);
