-- ============================================
-- VERIFICATION SCRIPT FOR ALL MIGRATIONS
-- ============================================
-- Purpose: Verify that all migrations have been applied successfully
-- Date: 2026-04-25
-- ============================================

-- Check if chat_sessions table exists
SELECT 
  'chat_sessions' as table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'inyourtask-db' 
  AND table_name = 'chat_sessions';

-- Check if messages.session_id column exists
SELECT 
  'messages.session_id' as column_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'inyourtask-db' 
  AND table_name = 'messages' 
  AND column_name = 'session_id';

-- Check if project_workflow_templates table exists
SELECT 
  'project_workflow_templates' as table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'inyourtask-db' 
  AND table_name = 'project_workflow_templates';

-- Check if project_workflow_stages table exists
SELECT 
  'project_workflow_stages' as table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'inyourtask-db' 
  AND table_name = 'project_workflow_stages';

-- Check if project_workflow_history table exists
SELECT 
  'project_workflow_history' as table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'inyourtask-db' 
  AND table_name = 'project_workflow_history';

-- Check workflow templates count
SELECT 
  'Workflow Templates' as item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ OK'
    ELSE '❌ INCOMPLETE'
  END as status
FROM project_workflow_templates;

-- List all workflow templates
SELECT 
  template_id,
  category,
  template_name,
  JSON_LENGTH(stages) as stage_count
FROM project_workflow_templates
ORDER BY category;

-- Check default sessions created
SELECT 
  'Default Sessions' as item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OK'
    ELSE '⚠️ NO SESSIONS YET'
  END as status
FROM chat_sessions;

-- Summary of all tables
SELECT 
  table_name,
  table_rows as estimated_rows,
  ROUND(data_length / 1024 / 1024, 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'inyourtask-db'
  AND table_name IN (
    'chat_sessions',
    'project_workflow_templates',
    'project_workflow_stages',
    'project_workflow_history'
  )
ORDER BY table_name;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- ✅ chat_sessions: EXISTS
-- ✅ messages.session_id: EXISTS
-- ✅ project_workflow_templates: EXISTS (6 templates)
-- ✅ project_workflow_stages: EXISTS
-- ✅ project_workflow_history: EXISTS
-- ============================================
