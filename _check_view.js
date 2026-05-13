const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'ray-task_management' });
  const [views] = await conn.execute("SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW'");
  console.log('=== VIEWS ===');
  for (const v of views) {
    const name = Object.values(v)[0];
    try {
      const [def] = await conn.execute(`SHOW CREATE VIEW \`${name}\``);
      console.log(`\n${name}:`);
      console.log(def[0]['Create View'].substring(0, 500));
    } catch(e) { console.log(name + ': ' + e.message); }
  }
  await conn.end();
}
main().catch(e => console.error(e));
