const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host:'127.0.0.1', port:3306, user:'root', password:'', database:'ray-task_management' });
  const [tables] = await c.execute(
    "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND " +
    "(TABLE_NAME = 'projects' OR TABLE_NAME = 'tasks' OR TABLE_NAME = 'chat_conversations' OR TABLE_NAME = 'ai_agents') " +
    "AND (COLUMN_NAME LIKE '%workspace%' OR COLUMN_NAME LIKE '%scope%') " +
    "ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  console.log('=== Workspace-related columns ===');
  tables.forEach(t => console.log(t.TABLE_NAME + ' → ' + t.COLUMN_NAME + ' (' + t.COLUMN_TYPE + ')'));

  // Check if there's a workspace_id in projects and tasks
  const [allCols] = await c.execute(
    "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'projects' OR TABLE_NAME = 'tasks') " +
    "ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  console.log('\n=== All columns in projects/tasks ===');
  allCols.forEach(t => console.log(t.TABLE_NAME + ' → ' + t.COLUMN_NAME));

  await c.end();
}
main().catch(console.error);
