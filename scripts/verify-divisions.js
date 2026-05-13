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
  
  const [divs] = await c.execute('SELECT unit_name, unit_type FROM organizational_units WHERE unit_type = "division" ORDER BY unit_name');
  
  console.log('All Divisions:\n');
  divs.forEach(d => {
    const hasPrefix = d.unit_name.toLowerCase().startsWith('divisi ');
    console.log((hasPrefix ? '✅' : '❌') + ' ' + d.unit_name);
  });
  
  await c.end();
})();
