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

  console.log('\n=== ALL UNITS WITH PARENT INFO ===\n');
  const [units] = await c.execute(`
    SELECT ou.id, ou.unit_name, ou.unit_type, ou.level, ou.parent_id,
           p.unit_name as parent_name
    FROM organizational_units ou
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    ORDER BY ou.level, ou.parent_id, ou.unit_name
  `);

  units.forEach(u => {
    console.log(`[${u.id}] Lv${u.level} "${u.unit_name}" (${u.unit_type}) → parent: [${u.parent_id}] ${u.parent_name || 'ROOT'}`);
  });

  await c.end();
})();
