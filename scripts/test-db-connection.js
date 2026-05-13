/**
 * Test Database Connection
 * Run: node scripts/test-db-connection.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  };

  console.log('📋 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Password: ${config.password ? '***' : '(empty)'}\n`);

  let connection;
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');

    // Test queries
    console.log('📊 Testing queries...\n');

    // 1. Check projects
    const [projects] = await connection.execute('SELECT COUNT(*) as count FROM projects');
    console.log(`   Projects: ${projects[0].count} records`);

    // 2. Check tasks
    const [tasks] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
    console.log(`   Tasks: ${tasks[0].count} records`);

    // 3. Check users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`   Users: ${users[0].count} records`);

    // 4. Check brain_config
    const [brainConfig] = await connection.execute('SELECT COUNT(*) as count FROM brain_config');
    console.log(`   Brain Config: ${brainConfig[0].count} records`);

    // 5. Check brain_defaults
    const [brainDefaults] = await connection.execute('SELECT COUNT(*) as count FROM brain_defaults');
    console.log(`   Brain Defaults: ${brainDefaults[0].count} records`);

    // 6. Check weekly_snapshot (logs)
    const [logs] = await connection.execute('SELECT COUNT(*) as count FROM weekly_snapshot');
    console.log(`   Logs (weekly_snapshot): ${logs[0].count} records`);

    console.log('\n✅ All tests passed!');
    console.log('\n💡 If you see 0 records, you may need to:');
    console.log('   1. Import sample data');
    console.log('   2. Create some tasks/projects through the UI');
    console.log('   3. Run initialization scripts\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if MySQL is running');
    console.error('   2. Verify .env configuration');
    console.error('   3. Check database exists: CREATE DATABASE IF NOT EXISTS ray-task_management;');
    console.error('   4. Check user permissions');
    console.error('   5. Try connecting with MySQL client: mysql -u root -p\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.');
    }
  }
}

testConnection();
