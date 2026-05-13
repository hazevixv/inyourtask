-- Manual Migration Script
-- Run this in MySQL Workbench or command line

USE `ray-task_management`;

-- 1. Change tasks.assignee to assignees (TEXT for multiple)
ALTER TABLE tasks 
CHANGE COLUMN assignee assignees TEXT NULL;

-- 2. Add url to projects
ALTER TABLE projects 
ADD COLUMN url TEXT NULL AFTER notes;

-- 3. Add brief to projects
ALTER TABLE projects 
ADD COLUMN brief TEXT NULL AFTER url;

-- 4. Set default version for projects
UPDATE projects 
SET version = 1 
WHERE version IS NULL OR version = 0;

-- Verify changes
SHOW COLUMNS FROM tasks LIKE 'assignees';
SHOW COLUMNS FROM projects LIKE 'url';
SHOW COLUMNS FROM projects LIKE 'brief';

SELECT 'Migration completed successfully!' AS status;
