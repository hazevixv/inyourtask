const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });
  const [r] = await c.execute("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'avatar_prompt'");
  if (r[0].cnt === 0) {
    await c.execute("ALTER TABLE ai_agents ADD COLUMN avatar_prompt TEXT NULL AFTER avatar");
    console.log('✓ Added avatar_prompt column');
  } else {
    console.log('- SKIP: avatar_prompt already exists');
  }
  await c.end();
}
main().catch(console.error);
