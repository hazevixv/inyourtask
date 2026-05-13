-- Update organizational structure to support complex hierarchy
-- Add office_type to differentiate between office and manufacturing
SET @exist_office_type := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizational_units' AND COLUMN_NAME = 'office_type');
SET @sqlstmt_office_type := IF(@exist_office_type = 0, "ALTER TABLE organizational_units ADD COLUMN office_type ENUM('office', 'manufacturing', 'both', 'none') DEFAULT 'none' AFTER unit_type", 'SELECT "Column office_type already exists" AS message');
PREPARE stmt_office_type FROM @sqlstmt_office_type;
EXECUTE stmt_office_type;
DEALLOCATE PREPARE stmt_office_type;

-- Add staff_count for tracking assigned staff
SET @exist_staff_count := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizational_units' AND COLUMN_NAME = 'staff_count');
SET @sqlstmt_staff_count := IF(@exist_staff_count = 0, 'ALTER TABLE organizational_units ADD COLUMN staff_count INT DEFAULT 0 AFTER is_active', 'SELECT "Column staff_count already exists" AS message');
PREPARE stmt_staff_count FROM @sqlstmt_staff_count;
EXECUTE stmt_staff_count;
DEALLOCATE PREPARE stmt_staff_count;

-- Create table for staff assignments to organizational units
CREATE TABLE IF NOT EXISTS org_unit_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_unit_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  role ENUM('owner', 'direktur', 'manager', 'staff') DEFAULT 'staff',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(50),
  
  UNIQUE KEY unique_assignment (org_unit_id, username),
  FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(username) ON DELETE SET NULL,
  
  INDEX idx_org_unit (org_unit_id),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update users table to add hierarchy_level first if not exists
SET @exist_hierarchy_level := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hierarchy_level');
SET @sqlstmt_hierarchy_level := IF(@exist_hierarchy_level = 0, "ALTER TABLE users ADD COLUMN hierarchy_level ENUM('owner', 'direksi', 'manager', 'staff') DEFAULT 'staff' AFTER role", 'SELECT "Column hierarchy_level already exists" AS message');
PREPARE stmt_hierarchy_level FROM @sqlstmt_hierarchy_level;
EXECUTE stmt_hierarchy_level;
DEALLOCATE PREPARE stmt_hierarchy_level;

-- Update users table to add direktur_level
SET @exist_direktur_level := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'direktur_level');
SET @sqlstmt_direktur_level := IF(@exist_direktur_level = 0, "ALTER TABLE users ADD COLUMN direktur_level ENUM('owner', 'direktur_office', 'direktur_manufacturing', 'manager', 'staff') DEFAULT 'staff' AFTER hierarchy_level", 'SELECT "Column direktur_level already exists" AS message');
PREPARE stmt_direktur_level FROM @sqlstmt_direktur_level;
EXECUTE stmt_direktur_level;
DEALLOCATE PREPARE stmt_direktur_level;

-- Clear existing sample data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE organizational_units;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert the complete organizational structure based on the image

-- Level 0: Owner
INSERT INTO organizational_units (id, unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
(1, 'OWNER', 'Owner (Wendra Wilendra)', 'company', 'both', NULL, 0, '/OWNER', 1, '#dc2626', 'shield', 'Company Owner');

-- Level 1: Direktur Office
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
('DIREKTUR_OFFICE', 'Direktur Office Operations', 'company', 'office', 1, 1, '/OWNER/DIREKTUR_OFFICE', 1, '#3b82f6', 'building', 'Office Operations Director');

-- Level 1: Direktur Manufacturing
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
('DIREKTUR_MANUFACTURING', 'Direktur Lunaray Beauty Factory & Dian Indah Abadi (Manufacturing Cosmetics)', 'company', 'manufacturing', 1, 1, '/OWNER/DIREKTUR_MANUFACTURING', 2, '#8b5cf6', 'building', 'Manufacturing Operations Director');

-- Level 1: Unit Bisnis
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
('UNIT_BISNIS', 'Unit Bisnis', 'division', 'both', 1, 1, '/OWNER/UNIT_BISNIS', 3, '#f59e0b', 'briefcase', 'Business Units');

-- Level 1: Brand
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
('BRAND', 'Brand', 'division', 'both', 1, 1, '/OWNER/BRAND', 4, '#ec4899', 'award', 'Brand Management');

-- Level 1: Office
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon, description) VALUES
('OFFICE', 'Office', 'division', 'office', 1, 1, '/OWNER/OFFICE', 5, '#10b981', 'building-2', 'Office Operations');

-- Level 2: Unit Bisnis Managers
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('MANAGER_BALEIDE', 'Manager BALEIDE', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_BALEIDE', 1, '#f59e0b', 'user'),
('MANAGER_RAYPACK', 'Manager RAYPACK', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_RAYPACK', 2, '#f59e0b', 'user'),
('MANAGER_LABCOS', 'Manager LABCOS', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_LABCOS', 3, '#f59e0b', 'user'),
('MANAGER_RAY_ACADEMY', 'Manager RAY ACADEMY', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_RAY_ACADEMY', 4, '#f59e0b', 'user'),
('MANAGER_EBOOK', 'Manager EBOOK', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_EBOOK', 5, '#f59e0b', 'user'),
('MANAGER_WORKSPACE', 'Manager Workspace', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_WORKSPACE', 6, '#f59e0b', 'user'),
('MANAGER_RAYMEDIA', 'Manager RAYMEDIA', 'team', 'both', 4, 2, '/OWNER/UNIT_BISNIS/MANAGER_RAYMEDIA', 7, '#f59e0b', 'user');

-- Level 2: Brand Managers
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('MANAGER_B2C', 'Manager B2C', 'department', 'both', 5, 2, '/OWNER/BRAND/MANAGER_B2C', 1, '#ec4899', 'users'),
('MANAGER_B2B', 'Manager B2B', 'department', 'both', 5, 2, '/OWNER/BRAND/MANAGER_B2B', 2, '#ec4899', 'users'),
('MANAGER_B2B2C', 'Manager B2B2C', 'department', 'both', 5, 2, '/OWNER/BRAND/MANAGER_B2B2C', 3, '#ec4899', 'users');

-- Level 3: B2C Brands
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('BEAUTYLATORY_STORE', 'BEAUTYLATORY Store', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/BEAUTYLATORY_STORE', 1, '#ec4899', 'package'),
('BEAUTYLATORY_PRODUK', 'BEAUTYLATORY Produk', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/BEAUTYLATORY_PRODUK', 2, '#ec4899', 'package'),
('MOMMYLATORY', 'MOMMYLATORY', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/MOMMYLATORY', 3, '#ec4899', 'package'),
('BABYLATORY', 'BABYLATORY', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/BABYLATORY', 4, '#ec4899', 'package'),
('DERMOND', 'DERMOND', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/DERMOND', 5, '#ec4899', 'package'),
('ADHWA', 'ADHWA', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/ADHWA', 6, '#ec4899', 'package'),
('SHELLNA', 'SHELLNA', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/SHELLNA', 7, '#ec4899', 'package'),
('MYKLON', 'MYKLON', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/MYKLON', 8, '#ec4899', 'package'),
('CKK', 'CKK', 'product', 'both', 8, 3, '/OWNER/BRAND/MANAGER_B2C/CKK', 9, '#ec4899', 'package');

-- Level 3: B2B Brands
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('MAZRA', 'MAZRA', 'product', 'both', 9, 3, '/OWNER/BRAND/MANAGER_B2B/MAZRA', 1, '#ec4899', 'package'),
('HAILOCY', 'HAILOCY', 'product', 'both', 9, 3, '/OWNER/BRAND/MANAGER_B2B/HAILOCY', 2, '#ec4899', 'package'),
('INALOVERS_SANTRIPRENUER', 'INALOVERS SANTRIPRENUER', 'product', 'both', 9, 3, '/OWNER/BRAND/MANAGER_B2B/INALOVERS_SANTRIPRENUER', 3, '#ec4899', 'package'),
('DERMALINK', 'DERMALINK', 'product', 'both', 9, 3, '/OWNER/BRAND/MANAGER_B2B/DERMALINK', 4, '#ec4899', 'package');

-- Level 2: Office Divisions
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('DIVISI_DESIGNER', 'Divisi Designer', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_DESIGNER', 1, '#10b981', 'pen-tool'),
('DIVISI_SOCIAL_MEDIA', 'Divisi Social Media', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_SOCIAL_MEDIA', 2, '#10b981', 'users'),
('DIVISI_IT_AI', 'Divisi IT & AI', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_IT_AI', 3, '#10b981', 'code'),
('DIVISI_MARKETING_SALES', 'Divisi Marketing & Sales', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_MARKETING_SALES', 4, '#10b981', 'briefcase'),
('DIVISI_FINANCE', 'Divisi Finance', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_FINANCE', 5, '#10b981', 'file-text'),
('DIVISI_CREATIVE', 'Divisi Creative', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_CREATIVE', 6, '#10b981', 'palette'),
('DIVISI_MARKETING', 'Divisi Marketing', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_MARKETING', 7, '#10b981', 'briefcase'),
('DIVISI_RESEARCH_DEVELOPMENT', 'Divisi Research & Development', 'department', 'office', 6, 2, '/OWNER/OFFICE/DIVISI_RESEARCH_DEVELOPMENT', 8, '#10b981', 'server');

-- Level 2: Manufacturing Divisions
INSERT INTO organizational_units (unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order, color, icon) VALUES
('DIVISI_RESEARCH_DEVELOPMENT_MFG', 'Divisi Research & Development', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_RESEARCH_DEVELOPMENT_MFG', 1, '#8b5cf6', 'server'),
('DIVISI_MARKETING_SALES_MFG', 'Divisi Marketing & Sales', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_MARKETING_SALES_MFG', 2, '#8b5cf6', 'briefcase'),
('DIVISI_PRODUCTION', 'Divisi Production', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_PRODUCTION', 3, '#8b5cf6', 'package'),
('DIVISI_PPIC', 'Divisi PPIC', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_PPIC', 4, '#8b5cf6', 'folder'),
('DIVISI_ADMINISTRATIVE', 'Divisi Administrative', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_ADMINISTRATIVE', 5, '#8b5cf6', 'file-text'),
('DIVISI_LEGAL', 'Divisi Legal', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_LEGAL', 6, '#8b5cf6', 'shield'),
('DIVISI_GENERAL_AFFAIR', 'Divisi General Affair', 'department', 'manufacturing', 3, 2, '/OWNER/DIREKTUR_MANUFACTURING/DIVISI_GENERAL_AFFAIR', 7, '#8b5cf6', 'users');
