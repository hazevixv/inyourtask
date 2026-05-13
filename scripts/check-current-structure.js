const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });
  
  const [units] = await c.execute('SELECT id, unit_name, unit_type, parent_id FROM organizational_units ORDER BY level, unit_name');
  
  console.log('Current Structure:\n');
  units.forEach(u => console.log(`${u.id}. ${u.unit_name} (${u.unit_type}) - parent: ${u.parent_id}`));
  
  await c.end();
})();
