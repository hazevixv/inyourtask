-- Fix Organizational System - Add missing columns and tables
-- Date: 2026-04-24

-- 1. Ensure office_type column exists in organizational_units
ALTER TABLE organizational_units 
ADD COLUMN IF NOT EXISTS office_type VARCHAR(20) DEFAULT 'none' 
COMMENT 'Office type: office, manufacturing, both, none';

-- 2. Ensure team_members table exists with org_unit_id
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_unit_id INT NOT NULL,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'member' COMMENT 'member, lead, manager, pic',
  added_by VARCHAR(100),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member (org_unit_id, username),
  FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  INDEX idx_org_unit (org_unit_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ensure org_unit_staff table exists (for staff assignments)
CREATE TABLE IF NOT EXISTS org_unit_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  assigned_by VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_staff (unit_id, username),
  FOREIGN KEY (unit_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  INDEX idx_unit (unit_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Update v_org_hierarchy view to include staff counts
DROP VIEW IF EXISTS v_org_hierarchy;

CREATE VIEW v_org_hierarchy AS
SELECT 
  ou.*,
  COUNT(DISTINCT ous.username) as staff_count
FROM organizational_units ou
LEFT JOIN org_unit_staff ous ON ou.id = ous.unit_id
GROUP BY ou.id;

-- 5. Add indexes for better performance
ALTER TABLE organizational_units ADD INDEX IF NOT EXISTS idx_parent_id (parent_id);
ALTER TABLE organizational_units ADD INDEX IF NOT EXISTS idx_level (level);
ALTER TABLE organizational_units ADD INDEX IF NOT EXISTS idx_path (path(100));
ALTER TABLE organizational_units ADD INDEX IF NOT EXISTS idx_is_active (is_active);

-- 6. Ensure users table has org_unit_id column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS org_unit_id INT NULL 
COMMENT 'Link to organizational unit';

ALTER TABLE users 
ADD FOREIGN KEY IF NOT EXISTS fk_users_org_unit (org_unit_id) 
REFERENCES organizational_units(id) ON DELETE SET NULL;

-- Success message
SELECT 'Organizational system fixed successfully!' as message;
