const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_type VARCHAR(50) NOT NULL,
      item_id VARCHAR(50) NOT NULL,
      item_name VARCHAR(255) DEFAULT NULL,
      project_name VARCHAR(100) DEFAULT NULL,
      change_type VARCHAR(50) NOT NULL,
      from_version INT DEFAULT 0,
      to_version INT DEFAULT 0,
      from_value TEXT,
      to_value TEXT,
      changed_by VARCHAR(100) DEFAULT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_item (item_type, item_id),
      INDEX idx_changed (changed_by),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ logs table created');

  const [tables] = await conn.execute('SHOW TABLES');
  console.log('Total tables: ' + tables.length);

  await conn.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
