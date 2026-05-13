const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateTaskPriorities() {
  let connection;
  
  try {
    console.log('🔄 Migrating task priorities...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Check current priorities in tasks
    const [currentPriorities] = await connection.query(`
      SELECT DISTINCT priority, COUNT(*) as count
      FROM tasks
      GROUP BY priority
      ORDER BY priority
    `);
    
    console.log('📋 Current task priorities:');
    currentPriorities.forEach(p => {
      console.log(`   ${p.priority}: ${p.count} tasks`);
    });
    
    // Migrate P0 -> Urgent
    const [p0] = await connection.query(`
      UPDATE tasks SET priority = 'Urgent' WHERE priority = 'P0'
    `);
    if (p0.affectedRows > 0) {
      console.log(`\n✅ Migrated ${p0.affectedRows} tasks from P0 to Urgent`);
    }
    
    // Migrate P1 -> High
    const [p1] = await connection.query(`
      UPDATE tasks SET priority = 'High' WHERE priority = 'P1'
    `);
    if (p1.affectedRows > 0) {
      console.log(`✅ Migrated ${p1.affectedRows} tasks from P1 to High`);
    }
    
    // Migrate P2 -> Normal
    const [p2] = await connection.query(`
      UPDATE tasks SET priority = 'Normal' WHERE priority = 'P2'
    `);
    if (p2.affectedRows > 0) {
      console.log(`✅ Migrated ${p2.affectedRows} tasks from P2 to Normal`);
    }
    
    // Migrate P3 -> Low
    const [p3] = await connection.query(`
      UPDATE tasks SET priority = 'Low' WHERE priority = 'P3'
    `);
    if (p3.affectedRows > 0) {
      console.log(`✅ Migrated ${p3.affectedRows} tasks from P3 to Low`);
    }
    
    // Show final result
    const [finalPriorities] = await connection.query(`
      SELECT DISTINCT priority, COUNT(*) as count
      FROM tasks
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Normal' THEN 3
          WHEN 'Low' THEN 4
          WHEN 'Recurring' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\n✅ Final task priorities:');
    finalPriorities.forEach(p => {
      console.log(`   ${p.priority}: ${p.count} tasks`);
    });
    
    console.log('\n🎉 Task priority migration completed!');
    
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

migrateTaskPriorities();
