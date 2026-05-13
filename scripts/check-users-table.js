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
  const connection = await mysql.createConnection(dbConfig);
  
  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    ORDER BY ORDINAL_POSITION
  `, [dbConfig.database]);
  
  console.log('Current users table structure:');
  console.log('================================');
  columns.forEach(col => {
    console.log(`${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  await connection.end();
}

main();
