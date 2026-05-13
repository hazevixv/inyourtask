const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host:'127.0.0.1', port:3306, user:'root', password:'', database:'ray-task_management' });
  try {
    await c.execute("ALTER TABLE users ADD COLUMN organization VARCHAR(100) NULL AFTER job_position");
    console.log('✓ Added organization column to users table');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
    else console.error('ERROR:', err.message);
  }
  // Also add the column via sync-primary-info's UPDATE likely needs it
  const [rows] = await c.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
  console.log('Users columns:', rows.map(r => r.COLUMN_NAME).join(', '));
  await c.end();
}
main().catch(console.error);
