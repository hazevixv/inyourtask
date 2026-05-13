const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host:'127.0.0.1', user:'root', password:'', database:'ray-task_management' });
  const [r] = await c.execute("SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_sessions'");
  console.log('chat_sessions table:', r[0].cnt > 0 ? 'EXISTS' : 'MISSING');
  if (r[0].cnt > 0) {
    const [s] = await c.execute("SELECT COUNT(*) as cnt FROM chat_sessions");
    console.log('Sessions:', s[0].cnt);
  }
  await c.end();
})();
