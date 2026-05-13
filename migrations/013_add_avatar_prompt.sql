-- ============================================
-- MIGRATION 013: ADD AVATAR PROMPT TO AI AGENTS
-- ============================================
ALTER TABLE ai_agents
  ADD COLUMN avatar_prompt TEXT NULL AFTER avatar;

SELECT 'Migration 013 completed' AS status;
