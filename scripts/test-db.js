const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  let connection;
  
  try {
    console.log('Testing database connection...');
    console.log('Host:', process.env.DB_HOST || '127.0.0.1');
    console.log('Port:', process.env.DB_PORT || '3306');
    console.log('User:', process.env.DB_USER || 'root');
    console.log('Database:', process.env.DB_NAME || 'ray-task_management');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    console.log('✅ Connected successfully!');
    
    // Test queries
    const [projects] = await connection.query('SELECT COUNT(*) as count FROM projects');
    console.log('✅ Projects count:', projects[0].count);
    
    const [tasks] = await connection.query('SELECT COUNT(*) as count FROM tasks');
    console.log('✅ Tasks count:', tasks[0].count);
    
    const [logs] = await connection.query('SELECT COUNT(*) as count FROM weekly_snapshot');
    console.log('✅ Logs count:', logs[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection();
