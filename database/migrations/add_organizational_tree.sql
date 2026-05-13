-- Enhanced organizational structure with tree hierarchy
CREATE TABLE IF NOT EXISTS organizational_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_code VARCHAR(50) UNIQUE NOT NULL,
  unit_name VARCHAR(200) NOT NULL,
  unit_type ENUM('company', 'brand', 'product', 'division', 'department', 'team', 'unit') NOT NULL,
  parent_id INT DEFAULT NULL,
  level INT DEFAULT 0,
  path VARCHAR(500) DEFAULT NULL, -- Materialized path for quick queries
  sort_order INT DEFAULT 0,
  
  -- Leadership
  owner_username VARCHAR(50) DEFAULT NULL,
  direksi_username VARCHAR(50) DEFAULT NULL,
  manager_username VARCHAR(50) DEFAULT NULL,
  
  -- Metadata
  description TEXT,
  color VARCHAR(7) DEFAULT '#7c3aed',
  icon VARCHAR(50) DEFAULT 'building',
  is_active TINYINT(1) DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50) DEFAULT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (parent_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE SET NULL,
  FOREIGN KEY (direksi_username) REFERENCES users(username) ON DELETE SET NULL,
  FOREIGN KEY (manager_username) REFERENCES users(username) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(username) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_parent (parent_id),
  INDEX idx_path (path),
  INDEX idx_type (unit_type),
  INDEX idx_level (level),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update users table to reference organizational units
SET @exist_org_unit_users := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'org_unit_id');
SET @sqlstmt_users := IF(@exist_org_unit_users = 0, 'ALTER TABLE users ADD COLUMN org_unit_id INT DEFAULT NULL', 'SELECT ''Column org_unit_id already exists in users'' AS message');
PREPARE stmt_users FROM @sqlstmt_users;
EXECUTE stmt_users;
DEALLOCATE PREPARE stmt_users;

SET @exist_fk_users := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'fk_org_unit');
SET @sqlstmt_fk_users := IF(@exist_fk_users = 0, 'ALTER TABLE users ADD CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE SET NULL', 'SELECT ''Constraint fk_org_unit already exists'' AS message');
PREPARE stmt_fk_users FROM @sqlstmt_fk_users;
EXECUTE stmt_fk_users;
DEALLOCATE PREPARE stmt_fk_users;

-- Update projects table to reference organizational units
SET @exist_org_unit_projects := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'org_unit_id');
SET @sqlstmt_projects := IF(@exist_org_unit_projects = 0, 'ALTER TABLE projects ADD COLUMN org_unit_id INT DEFAULT NULL', 'SELECT ''Column org_unit_id already exists in projects'' AS message');
PREPARE stmt_projects FROM @sqlstmt_projects;
EXECUTE stmt_projects;
DEALLOCATE PREPARE stmt_projects;

SET @exist_fk_projects := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND CONSTRAINT_NAME = 'fk_project_org_unit');
SET @sqlstmt_fk_projects := IF(@exist_fk_projects = 0, 'ALTER TABLE projects ADD CONSTRAINT fk_project_org_unit FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE SET NULL', 'SELECT ''Constraint fk_project_org_unit already exists'' AS message');
PREPARE stmt_fk_projects FROM @sqlstmt_fk_projects;
EXECUTE stmt_fk_projects;
DEALLOCATE PREPARE stmt_fk_projects;

-- Update tasks table to reference organizational units
SET @exist_org_unit_tasks := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'org_unit_id');
SET @sqlstmt_tasks := IF(@exist_org_unit_tasks = 0, 'ALTER TABLE tasks ADD COLUMN org_unit_id INT DEFAULT NULL', 'SELECT ''Column org_unit_id already exists in tasks'' AS message');
PREPARE stmt_tasks FROM @sqlstmt_tasks;
EXECUTE stmt_tasks;
DEALLOCATE PREPARE stmt_tasks;

SET @exist_fk_tasks := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'fk_task_org_unit');
SET @sqlstmt_fk_tasks := IF(@exist_fk_tasks = 0, 'ALTER TABLE tasks ADD CONSTRAINT fk_task_org_unit FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE SET NULL', 'SELECT ''Constraint fk_task_org_unit already exists'' AS message');
PREPARE stmt_fk_tasks FROM @sqlstmt_fk_tasks;
EXECUTE stmt_fk_tasks;
DEALLOCATE PREPARE stmt_fk_tasks;

-- Create organizational hierarchy view for quick access
CREATE OR REPLACE VIEW v_org_hierarchy AS
SELECT 
  ou.*,
  owner.full_name as owner_name,
  owner.avatar as owner_avatar,
  dir.full_name as direksi_name,
  dir.avatar as direksi_avatar,
  mgr.full_name as manager_name,
  mgr.avatar as manager_avatar,
  COUNT(DISTINCT u.username) as member_count,
  COUNT(DISTINCT p.project_id) as project_count,
  COUNT(DISTINCT t.task_id) as task_count
FROM organizational_units ou
LEFT JOIN users owner ON owner.username = ou.owner_username
LEFT JOIN users dir ON dir.username = ou.direksi_username
LEFT JOIN users mgr ON mgr.username = ou.manager_username
LEFT JOIN users u ON u.org_unit_id = ou.id AND u.is_active = 1
LEFT JOIN projects p ON p.org_unit_id = ou.id
LEFT JOIN tasks t ON t.org_unit_id = ou.id
GROUP BY ou.id;

-- Insert sample organizational structure (skip if already exists)
INSERT IGNORE INTO organizational_units (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon) VALUES
-- Level 0: Workspace root
('WORKSPACE', 'Workspace', 'company', NULL, 0, '/WORKSPACE', 1, '#7c3aed', 'building-2'),

-- Level 1: Brands
('BRAND_A', 'Brand A', 'brand', 1, 1, '/WORKSPACE/BRAND_A', 1, '#3b82f6', 'award'),
('BRAND_B', 'Brand B', 'brand', 1, 1, '/WORKSPACE/BRAND_B', 2, '#10b981', 'award'),

-- Level 2: Products under Brand A
('PRODUCT_A1', 'Product A1', 'product', 2, 2, '/WORKSPACE/BRAND_A/PRODUCT_A1', 1, '#f59e0b', 'package'),
('PRODUCT_A2', 'Product A2', 'product', 2, 2, '/WORKSPACE/BRAND_A/PRODUCT_A2', 2, '#f59e0b', 'package'),

-- Level 2: Divisions (cross-brand)
('CREATIVE', 'Creative Division', 'division', 1, 1, '/WORKSPACE/CREATIVE', 3, '#ec4899', 'palette'),
('IT_SUPPORT', 'IT Support', 'division', 1, 1, '/WORKSPACE/IT_SUPPORT', 4, '#8b5cf6', 'code'),
('GA_SUPPORT', 'GA & Support', 'division', 1, 1, '/WORKSPACE/GA_SUPPORT', 5, '#06b6d4', 'users'),

-- Level 3: Departments under Creative
('CREATIVE_CONTENT', 'Content Team', 'department', 6, 2, '/WORKSPACE/CREATIVE/CREATIVE_CONTENT', 1, '#ec4899', 'file-text'),
('CREATIVE_DESIGN', 'Design Team', 'department', 6, 2, '/WORKSPACE/CREATIVE/CREATIVE_DESIGN', 2, '#ec4899', 'pen-tool'),

-- Level 3: Teams under IT Support
('IT_DEV', 'Development Team', 'team', 7, 2, '/WORKSPACE/IT_SUPPORT/IT_DEV', 1, '#8b5cf6', 'code-2'),
('IT_INFRA', 'Infrastructure Team', 'team', 7, 2, '/WORKSPACE/IT_SUPPORT/IT_INFRA', 2, '#8b5cf6', 'server');

-- Sample data inserted successfully
