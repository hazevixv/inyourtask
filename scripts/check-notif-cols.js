const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host:'127.0.0.1', port:3306, user:'root', password:'', database:'ray-task_management' });
  const [rows] = await c.execute(
    "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('notifications', 'chat_conversations') " +
    "ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  rows.forEach(r => console.log(r.TABLE_NAME + ' → ' + r.COLUMN_NAME));
  await c.end();
}
main().catch(console.error);
