const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPriorityConfig() {
  let connection;
  
  try {
    console.log('🔄 Fixing priority configuration...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Delete old P0, P1, P2, P3 priorities
    console.log('🗑️  Deleting old priorities (P0, P1, P2, P3)...');
    await connection.query(`
      DELETE FROM brain_config 
      WHERE config_type = 'priority' 
      AND config_value IN ('P0', 'P1', 'P2', 'P3')
    `);
    
    // Check if new priorities exist
    const [existing] = await connection.query(`
      SELECT config_value 
      FROM brain_config 
      WHERE config_type = 'priority'
      ORDER BY display_order
    `);
    
    const existingValues = existing.map(r => r.config_value);
    console.log('📋 Existing priorities:', existingValues);
    
    // Add new priorities if they don't exist
    const newPriorities = [
      { value: 'Urgent', order: 1 },
      { value: 'High', order: 2 },
      { value: 'Normal', order: 3 },
      { value: 'Low', order: 4 },
      { value: 'Recurring', order: 5 }
    ];
    
    for (const priority of newPriorities) {
      if (!existingValues.includes(priority.value)) {
        await connection.query(`
          INSERT INTO brain_config (config_type, config_value, display_order, is_active)
          VALUES ('priority', ?, ?, TRUE)
        `, [priority.value, priority.order]);
        console.log(`✅ Added: ${priority.value}`);
      } else {
        console.log(`⏭️  Skipped: ${priority.value} (already exists)`);
      }
    }
    
    // Update display order for existing priorities
    console.log('\n🔢 Updating display order...');
    for (const priority of newPriorities) {
      await connection.query(`
        UPDATE brain_config 
        SET display_order = ? 
        WHERE config_type = 'priority' AND config_value = ?
      `, [priority.order, priority.value]);
    }
    
    // Show final result
    const [final] = await connection.query(`
      SELECT config_value, display_order 
      FROM brain_config 
      WHERE config_type = 'priority'
      ORDER BY display_order
    `);
    
    console.log('\n✅ Final priority configuration:');
    final.forEach(p => {
      console.log(`   ${p.display_order}. ${p.config_value}`);
    });
    
    console.log('\n🎉 Priority configuration fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

fixPriorityConfig();
