const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePriority() {
  let connection;
  
  try {
    console.log('🔄 Updating priority options...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Update brain_defaults
    await connection.query(`
      UPDATE brain_defaults 
      SET default_value = 'Urgent,High,Normal,Low,Recurring' 
      WHERE default_key = 'priority_options'
    `);
    console.log('✅ Updated brain_defaults priority_options');
    
    // Update existing tasks from P0/P1/P2/P3 to new format
    await connection.query("UPDATE tasks SET priority = 'Urgent' WHERE priority = 'P0'");
    await connection.query("UPDATE tasks SET priority = 'High' WHERE priority = 'P1'");
    await connection.query("UPDATE tasks SET priority = 'Normal' WHERE priority = 'P2'");
    await connection.query("UPDATE tasks SET priority = 'Low' WHERE priority = 'P3'");
    console.log('✅ Updated existing tasks priorities');
    
    console.log('\n🎉 Priority update completed!');
    console.log('New priorities: Urgent, High, Normal, Low, Recurring');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

updatePriority();
