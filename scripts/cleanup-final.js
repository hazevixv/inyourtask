const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  const keepUsers = ['hazevixv-admin', 'admin', 'taufik', 'haazima', 'iman'];
  const [users] = await conn.execute('SELECT id, username FROM users');
  
  for (const u of users) {
    if (keepUsers.includes(u.username)) continue;
    await conn.execute('DELETE FROM workspace_members WHERE username = ?', [u.username]);
    await conn.execute('DELETE FROM chat_members WHERE username = ?', [u.username]);
    await conn.execute('DELETE FROM org_unit_staff WHERE username = ?', [u.username]);
    await conn.execute('DELETE FROM team_members WHERE username = ?', [u.username]);
    await conn.execute('DELETE FROM notifications WHERE user_id = ?', [u.username]);
    await conn.execute('DELETE FROM sessions WHERE user_id = ?', [u.id]);
    await conn.execute('DELETE FROM users WHERE id = ?', [u.id]);
    console.log('DELETED: ' + u.username);
  }

  await conn.execute('DROP TABLE IF EXISTS employees');
  await conn.execute('DROP TABLE IF EXISTS divisions');
  await conn.execute('DELETE FROM organizational_units');
  await conn.execute('DELETE FROM org_unit_staff');
  
  console.log('\nCleanup complete!');
  const [remaining] = await conn.execute('SELECT username, full_name FROM users');
  console.log('\nRemaining users (' + remaining.length + '):');
  remaining.forEach(r => console.log(' - ' + r.username + ' (' + (r.full_name || '') + ')'));
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
