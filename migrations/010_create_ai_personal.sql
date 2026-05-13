-- ============================================
-- MIGRATION 010: CREATE AI PERSONAL AGENT
-- ============================================
-- Purpose: Create default AI Personal agent for all users
-- Date: 2026-04-25
-- ============================================

-- Check if AI Personal agent already exists
-- If not, create one

INSERT INTO ai_agents (
  agent_id,
  name,
  role,
  description,
  system_prompt,
  is_personal,
  is_active,
  created_at,
  updated_at
)
SELECT
  'agent-personal-default',
  'My AI Assistant',
  'Personal AI Assistant',
  'Your personal AI assistant for all your needs',
  'You are a helpful, friendly, and knowledgeable AI assistant. You help users with tasks, answer questions, and provide support. Be concise, clear, and professional.',
  TRUE,
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_agents WHERE is_personal = TRUE
);

-- Verify AI Personal agent exists
SELECT 
  agent_id,
  name,
  role,
  is_personal,
  is_active
FROM ai_agents 
WHERE is_personal = TRUE;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- Should return 1 row with:
-- agent_id: agent-personal-default
-- name: My AI Assistant
-- role: Personal AI Assistant
-- is_personal: 1 (TRUE)
-- is_active: 1 (TRUE)

