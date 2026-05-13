-- ============================================
-- TEST WORKFLOW SYSTEM
-- ============================================
-- Purpose: Test and verify workflow system is working
-- Date: 2026-04-25
-- ============================================

-- Step 1: Check if templates exist
SELECT 
  'Workflow Templates' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM project_workflow_templates;

-- Step 2: List all templates
SELECT 
  template_id,
  category,
  template_name,
  JSON_LENGTH(stages) as stage_count
FROM project_workflow_templates
ORDER BY category;

-- Step 3: Create test project (if not exists)
INSERT IGNORE INTO projects (
  project_id, 
  project_name, 
  category, 
  status, 
  progress, 
  owner, 
  created_by,
  created_at
) VALUES (
  'TEST-WORKFLOW-001',
  'Test Workflow Project',
  'Manufacture',
  'Planning',
  '0%',
  'admin',
  'admin',
  NOW()
);

-- Step 4: Check if test project exists
SELECT 
  'Test Project' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM projects 
WHERE project_id = 'TEST-WORKFLOW-001';

-- Step 5: Create workflow for test project
-- (This should be done via API: POST /api/projects/TEST-WORKFLOW-001/workflow)

-- Step 6: Check workflow stages (after API call)
SELECT 
  'Workflow Stages' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '⚠️ NOT CREATED YET - Call API to create'
  END as status
FROM project_workflow_stages
WHERE project_id = 'TEST-WORKFLOW-001';

-- Step 7: View workflow stages (if exists)
SELECT 
  stage_id,
  stage_name,
  stage_order,
  assigned_division,
  status,
  started_at,
  completed_at
FROM project_workflow_stages
WHERE project_id = 'TEST-WORKFLOW-001'
ORDER BY stage_order;

-- Step 8: View workflow history (if exists)
SELECT 
  h.history_id,
  s.stage_name,
  h.old_status,
  h.new_status,
  h.changed_by,
  h.changed_at,
  h.notes
FROM project_workflow_history h
JOIN project_workflow_stages s ON h.stage_id = s.stage_id
WHERE h.project_id = 'TEST-WORKFLOW-001'
ORDER BY h.changed_at DESC;

-- ============================================
-- CLEANUP (Optional - run if you want to reset)
-- ============================================
-- DELETE FROM project_workflow_stages WHERE project_id = 'TEST-WORKFLOW-001';
-- DELETE FROM projects WHERE project_id = 'TEST-WORKFLOW-001';

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- ✅ Workflow Templates: 6 templates
-- ✅ Test Project: 1 project
-- ⚠️ Workflow Stages: 0 (until API called)
-- After calling POST /api/projects/TEST-WORKFLOW-001/workflow:
-- ✅ Workflow Stages: 7 stages (for Manufacture category)
-- ============================================
