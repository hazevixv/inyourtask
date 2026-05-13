const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  await c.execute("DELETE FROM brain_config WHERE config_type='priority' AND config_value IN ('P0','P1','P2','P3')");
  const [r] = await c.execute("SELECT config_value FROM brain_config WHERE config_type='priority' ORDER BY id");
  console.log('Remaining priorities:', r);

  await c.end();
})();
