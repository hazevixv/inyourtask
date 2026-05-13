-- ============================================
-- Seed brain_config and brain_defaults tables
-- ============================================
-- Run this in MySQL to populate default configuration values
-- ============================================

USE `ray-task_management`;

-- ============================================
-- STEP 1: Seed brain_config table
-- ============================================

-- Status options
INSERT INTO brain_config (config_type, config_value, category_tag, display_order, is_active) VALUES
('status', 'Backlog', NULL, 1, TRUE),
('status', 'To Do', NULL, 2, TRUE),
('status', 'In Progress', NULL, 3, TRUE),
('status', 'In Review', NULL, 4, TRUE),
('status', 'Done', NULL, 5, TRUE),
('status', 'Closed', NULL, 6, TRUE)
ON DUPLICATE KEY UPDATE
  category_tag = VALUES(category_tag),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

-- Priority levels
INSERT INTO brain_config (config_type, config_value, category_tag, display_order, is_active) VALUES
('priority', 'Low', NULL, 1, TRUE),
('priority', 'Normal', NULL, 2, TRUE),
('priority', 'High', NULL, 3, TRUE),
('priority', 'Urgent', NULL, 4, TRUE),
('priority', 'Recurring', NULL, 5, TRUE)
ON DUPLICATE KEY UPDATE
  category_tag = VALUES(category_tag),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

-- Progress levels
INSERT INTO brain_config (config_type, config_value, category_tag, display_order, is_active) VALUES
('progress', '0%', NULL, 1, TRUE),
('progress', '25%', NULL, 2, TRUE),
('progress', '50%', NULL, 3, TRUE),
('progress', '75%', NULL, 4, TRUE),
('progress', '100%', NULL, 5, TRUE)
ON DUPLICATE KEY UPDATE
  category_tag = VALUES(category_tag),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

-- Categories
INSERT INTO brain_config (config_type, config_value, category_tag, display_order, is_active) VALUES
('category', 'Development', 'Produk', 1, TRUE),
('category', 'Design', 'Produk', 2, TRUE),
('category', 'Marketing', 'Brand', 3, TRUE),
('category', 'Infrastructure', 'Perusahaan', 4, TRUE),
('category', 'Internal', 'Lainnya', 5, TRUE),
('category', 'Client Project', 'Produk', 6, TRUE),
('category', 'Personal Project', 'Lainnya', 7, TRUE)
ON DUPLICATE KEY UPDATE
  category_tag = VALUES(category_tag),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

-- ============================================
-- STEP 2: Seed brain_defaults table
-- ============================================

INSERT INTO brain_defaults (default_key, default_value) VALUES
('default_status', 'Backlog'),
('default_priority', 'Normal'),
('default_progress', '0%'),
('default_category', 'Development'),
('default_assignee', 'Workspace Owner')
ON DUPLICATE KEY UPDATE default_value = VALUES(default_value);

-- ============================================
-- STEP 3: Update existing projects/tasks with missing fields
-- ============================================

-- Set default visibility and created_by for existing projects
UPDATE projects
SET visibility = 'public',
    created_by = COALESCE(created_by, owner, 'admin')
WHERE visibility IS NULL OR visibility = '';

-- Set default visibility and created_by for existing tasks
UPDATE tasks
SET visibility = 'public',
    created_by = COALESCE(created_by, 'admin')
WHERE visibility IS NULL OR visibility = '';

-- ============================================
-- DONE! Verify with:
-- SELECT * FROM brain_config ORDER BY config_type, display_order;
-- SELECT * FROM brain_defaults;
-- ============================================
