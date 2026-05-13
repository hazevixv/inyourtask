const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixForeignKeys() {
  let connection;
  
  try {
    console.log('🔧 Fixing foreign key constraints...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Check existing foreign keys
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'tasks' 
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `, [process.env.DB_NAME || 'ray-task_management']);
    
    console.log('Existing foreign keys:', fks);
    
    // Drop existing foreign key if exists
    for (const fk of fks) {
      try {
        await connection.query(`ALTER TABLE tasks DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
      } catch (err) {
        console.log(`⚠️  Could not drop ${fk.CONSTRAINT_NAME}:`, err.message);
      }
    }
    
    // Add foreign key with ON DELETE CASCADE
    try {
      await connection.query(`
        ALTER TABLE tasks 
        ADD CONSTRAINT fk_tasks_project 
        FOREIGN KEY (project_id) 
        REFERENCES projects(project_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key with CASCADE');
    } catch (err) {
      console.log('⚠️  Foreign key might already exist:', err.message);
    }
    
    console.log('\n🎉 Foreign key constraints fixed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

fixForeignKeys();
