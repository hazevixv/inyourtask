/**
 * Setup Employees Table
 * Creates employees table and inserts all 93 employees
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    console.log('📋 Reading employees.sql file...');
    const sqlFile = path.join(__dirname, '..', 'assets', 'database', 'employee', 'employees.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ File read\n');

    console.log('🚀 Executing SQL...');
    await connection.query(sql);
    console.log('✅ Employees table created and data inserted\n');

    // Verify
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    console.log(`✅ Total employees: ${rows[0].count}\n`);

    console.log('🎉 SUCCESS! Employees table ready!');

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
