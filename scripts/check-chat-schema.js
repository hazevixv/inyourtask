const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('📋 chat_conversations table structure:\n');
  const [cols] = await conn.execute('DESCRIBE chat_conversations');
  cols.forEach(c => console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(30)} ${c.Null} ${c.Key} ${c.Default || ''}`));
  
  await conn.end();
})();
