const mysql = require('mysql2/promise');
require('dotenv').config();

async function hasColumn(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function hasIndex(conn, table, indexName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function hasForeignKey(conn, table, fkName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, fkName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function addColumnIfMissing(conn, table, column, ddl) {
  if (!(await hasColumn(conn, table, column))) {
    console.log(`Adding ${table}.${column}`);
    await conn.execute(ddl);
  }
}

async function addIndexIfMissing(conn, table, indexName, ddl) {
  if (!(await hasIndex(conn, table, indexName))) {
    console.log(`Adding index ${indexName}`);
    await conn.execute(ddl);
  }
}

async function addFkIfMissing(conn, table, fkName, ddl) {
  if (!(await hasForeignKey(conn, table, fkName))) {
    console.log(`Adding foreign key ${fkName}`);
    await conn.execute(ddl);
  }
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    multipleStatements: true,
  });

  try {
    await addColumnIfMissing(conn, 'projects', 'workspace_id', 'ALTER TABLE projects ADD COLUMN workspace_id VARCHAR(20) NULL AFTER org_unit_id');
    await addColumnIfMissing(conn, 'tasks', 'workspace_id', 'ALTER TABLE tasks ADD COLUMN workspace_id VARCHAR(20) NULL AFTER org_unit_id');
    await addColumnIfMissing(conn, 'chat_conversations', 'workspace_id', 'ALTER TABLE chat_conversations ADD COLUMN workspace_id VARCHAR(20) NULL AFTER conv_id');
    await addColumnIfMissing(conn, 'ai_agents', 'workspace_id', 'ALTER TABLE ai_agents ADD COLUMN workspace_id VARCHAR(20) NULL AFTER agent_id');

    await addIndexIfMissing(conn, 'projects', 'idx_projects_workspace_id', 'CREATE INDEX idx_projects_workspace_id ON projects (workspace_id)');
    await addIndexIfMissing(conn, 'tasks', 'idx_tasks_workspace_id', 'CREATE INDEX idx_tasks_workspace_id ON tasks (workspace_id)');
    await addIndexIfMissing(conn, 'chat_conversations', 'idx_chat_conversations_workspace_id', 'CREATE INDEX idx_chat_conversations_workspace_id ON chat_conversations (workspace_id)');
    await addIndexIfMissing(conn, 'ai_agents', 'idx_ai_agents_workspace_id', 'CREATE INDEX idx_ai_agents_workspace_id ON ai_agents (workspace_id)');

    await addFkIfMissing(conn, 'projects', 'fk_projects_workspace', 'ALTER TABLE projects ADD CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE');
    await addFkIfMissing(conn, 'tasks', 'fk_tasks_workspace', 'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE');
    await addFkIfMissing(conn, 'chat_conversations', 'fk_chat_conversations_workspace', 'ALTER TABLE chat_conversations ADD CONSTRAINT fk_chat_conversations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE');
    await addFkIfMissing(conn, 'ai_agents', 'fk_ai_agents_workspace', 'ALTER TABLE ai_agents ADD CONSTRAINT fk_ai_agents_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE');

    await conn.execute(`
      UPDATE projects p
      JOIN organizational_units ou ON ou.id = p.org_unit_id
      SET p.workspace_id = ou.workspace_id
      WHERE p.workspace_id IS NULL AND p.org_unit_id IS NOT NULL AND ou.workspace_id IS NOT NULL
    `);

    await conn.execute(`
      UPDATE tasks t
      JOIN organizational_units ou ON ou.id = t.org_unit_id
      SET t.workspace_id = ou.workspace_id
      WHERE t.workspace_id IS NULL AND t.org_unit_id IS NOT NULL AND ou.workspace_id IS NOT NULL
    `);

    await conn.execute(`
      UPDATE ai_agents a
      JOIN workspace_members wm ON wm.username = a.owner_username AND wm.is_primary = 1
      SET a.workspace_id = wm.workspace_id
      WHERE a.is_personal = 1 AND (a.workspace_id IS NULL OR a.workspace_id = '')
    `);

    await conn.execute(`
      UPDATE chat_conversations c
      JOIN ai_agents a ON a.agent_id = c.agent_id
      SET c.workspace_id = a.workspace_id
      WHERE c.workspace_id IS NULL AND c.agent_id IS NOT NULL
    `);

    console.log('Workspace scope migration complete.');
  } catch (error) {
    console.error('Workspace scope migration failed:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
