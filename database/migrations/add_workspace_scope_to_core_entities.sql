-- Add workspace scope to core entities so multi-workspace data stays isolated.
-- Safe to run multiple times on MySQL 9+.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(20) NULL AFTER org_unit_id;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(20) NULL AFTER org_unit_id;

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(20) NULL AFTER conv_id;

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(20) NULL AFTER agent_id;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace_id ON chat_conversations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_workspace_id ON ai_agents (workspace_id);

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE chat_conversations
  ADD CONSTRAINT fk_chat_conversations_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE ai_agents
  ADD CONSTRAINT fk_ai_agents_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

UPDATE projects p
JOIN organizational_units ou ON ou.id = p.org_unit_id
SET p.workspace_id = ou.workspace_id
WHERE p.workspace_id IS NULL AND p.org_unit_id IS NOT NULL AND ou.workspace_id IS NOT NULL;

UPDATE tasks t
JOIN organizational_units ou ON ou.id = t.org_unit_id
SET t.workspace_id = ou.workspace_id
WHERE t.workspace_id IS NULL AND t.org_unit_id IS NOT NULL AND ou.workspace_id IS NOT NULL;

UPDATE ai_agents a
JOIN workspace_members wm ON wm.username = a.owner_username AND wm.is_primary = 1
SET a.workspace_id = wm.workspace_id
WHERE a.is_personal = 1 AND (a.workspace_id IS NULL OR a.workspace_id = '');

UPDATE chat_conversations c
JOIN ai_agents a ON a.agent_id = c.agent_id
SET c.workspace_id = a.workspace_id
WHERE c.workspace_id IS NULL AND c.agent_id IS NOT NULL;
