-- Verification Script for Organizational Hierarchy System
-- Run this after the migration to verify everything is set up correctly

-- 1. Check if organizational_units table exists
SELECT 'Checking organizational_units table...' as step;
SELECT COUNT(*) as unit_count, 
       COUNT(DISTINCT unit_type) as type_count,
       COUNT(DISTINCT level) as level_count
FROM organizational_units;

-- 2. Check if view exists
SELECT 'Checking v_org_hierarchy view...' as step;
SELECT COUNT(*) as view_count FROM v_org_hierarchy;

-- 3. Check if users have org_unit_id column
SELECT 'Checking users.org_unit_id column...' as step;
SELECT COUNT(*) as users_with_org_unit,
       COUNT(DISTINCT org_unit_id) as distinct_units
FROM users 
WHERE org_unit_id IS NOT NULL;

-- 4. Check if projects have org_unit_id column
SELECT 'Checking projects.org_unit_id column...' as step;
SELECT COUNT(*) as total_projects,
       COUNT(org_unit_id) as projects_with_org_unit
FROM projects;

-- 5. Check if tasks have org_unit_id column
SELECT 'Checking tasks.org_unit_id column...' as step;
SELECT COUNT(*) as total_tasks,
       COUNT(org_unit_id) as tasks_with_org_unit
FROM tasks;

-- 6. Show organizational tree structure
SELECT 'Organizational Tree Structure:' as step;
SELECT 
    CONCAT(REPEAT('  ', level), unit_name) as hierarchy,
    unit_type,
    level,
    member_count,
    project_count,
    task_count,
    CASE WHEN is_active = 1 THEN '✓' ELSE '✗' END as active
FROM v_org_hierarchy
ORDER BY path;

-- 7. Show leadership assignments
SELECT 'Leadership Assignments:' as step;
SELECT 
    ou.unit_name,
    ou.unit_type,
    COALESCE(owner.full_name, '-') as owner,
    COALESCE(dir.full_name, '-') as direksi,
    COALESCE(mgr.full_name, '-') as manager
FROM organizational_units ou
LEFT JOIN users owner ON owner.username = ou.owner_username
LEFT JOIN users dir ON dir.username = ou.direksi_username
LEFT JOIN users mgr ON mgr.username = ou.manager_username
WHERE ou.is_active = 1
ORDER BY ou.level, ou.sort_order;

-- 8. Show users by hierarchy level
SELECT 'Users by Hierarchy Level:' as step;
SELECT 
    COALESCE(hierarchy_level, 'not_set') as hierarchy_level,
    COUNT(*) as user_count
FROM users
WHERE is_active = 1
GROUP BY hierarchy_level
ORDER BY 
    CASE hierarchy_level
        WHEN 'owner' THEN 1
        WHEN 'direksi' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 4
        ELSE 5
    END;

-- 9. Show division distribution
SELECT 'Division Distribution:' as step;
SELECT 
    COALESCE(division, 'No Division') as division,
    COUNT(*) as user_count,
    GROUP_CONCAT(DISTINCT job_position) as job_positions
FROM users
WHERE is_active = 1
GROUP BY division
ORDER BY user_count DESC;

-- 10. Check foreign key constraints
SELECT 'Foreign Key Constraints:' as step;
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'raymating'
  AND TABLE_NAME IN ('organizational_units', 'users', 'projects', 'tasks')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 11. Show sample hierarchy path
SELECT 'Sample Hierarchy Paths:' as step;
SELECT 
    unit_code,
    unit_name,
    unit_type,
    level,
    path
FROM organizational_units
ORDER BY path
LIMIT 10;

-- 12. Verify materialized path integrity
SELECT 'Verifying Path Integrity:' as step;
SELECT 
    COUNT(*) as total_units,
    COUNT(DISTINCT path) as unique_paths,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT path) THEN '✓ All paths unique'
        ELSE '✗ Duplicate paths found!'
    END as path_integrity
FROM organizational_units;

-- 13. Show team_members table structure (if exists)
SELECT 'Checking team_members table...' as step;
SELECT COUNT(*) as total_assignments,
       COUNT(DISTINCT item_type) as item_types,
       COUNT(DISTINCT role) as role_types
FROM team_members;

-- 14. Summary
SELECT '=== VERIFICATION SUMMARY ===' as step;
SELECT 
    (SELECT COUNT(*) FROM organizational_units) as total_units,
    (SELECT COUNT(*) FROM organizational_units WHERE is_active = 1) as active_units,
    (SELECT COUNT(DISTINCT unit_type) FROM organizational_units) as unit_types,
    (SELECT MAX(level) FROM organizational_units) as max_depth,
    (SELECT COUNT(*) FROM users WHERE org_unit_id IS NOT NULL) as users_assigned,
    (SELECT COUNT(*) FROM v_org_hierarchy) as view_records;

-- 15. Recommendations
SELECT 'Recommendations:' as step;
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE hierarchy_level IS NULL AND is_active = 1) > 0 
        THEN CONCAT('⚠️ ', (SELECT COUNT(*) FROM users WHERE hierarchy_level IS NULL AND is_active = 1), ' users without hierarchy_level')
        ELSE '✓ All users have hierarchy_level'
    END as hierarchy_check
UNION ALL
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE org_unit_id IS NULL AND is_active = 1) > 0 
        THEN CONCAT('⚠️ ', (SELECT COUNT(*) FROM users WHERE org_unit_id IS NULL AND is_active = 1), ' users not assigned to organizational units')
        ELSE '✓ All users assigned to organizational units'
    END
UNION ALL
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM organizational_units WHERE owner_username IS NULL AND level > 0) > 0 
        THEN CONCAT('⚠️ ', (SELECT COUNT(*) FROM organizational_units WHERE owner_username IS NULL AND level > 0), ' units without leadership')
        ELSE '✓ All units have leadership assigned'
    END;

SELECT '=== VERIFICATION COMPLETE ===' as step;
