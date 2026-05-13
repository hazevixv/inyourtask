const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host:'127.0.0.1', port:3306, user:'root', password:'', database:'ray-task_management' });
  const [rows] = await c.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
  );
  console.log('Users columns:', rows.map(r => r.COLUMN_NAME).join(', '));
  console.log('Has organization?', rows.some(r => r.COLUMN_NAME === 'organization'));
  await c.end();
}
main().catch(console.error);
