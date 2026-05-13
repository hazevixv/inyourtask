-- Add hierarchy system to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hierarchy_level ENUM('owner', 'direksi', 'manager', 'staff') DEFAULT 'staff',
ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_username VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS direksi_username VARCHAR(50) DEFAULT NULL;

-- Add foreign keys for hierarchy
ALTER TABLE users
ADD CONSTRAINT fk_manager FOREIGN KEY (manager_username) REFERENCES users(username) ON DELETE SET NULL,
ADD CONSTRAINT fk_direksi FOREIGN KEY (direksi_username) REFERENCES users(username) ON DELETE SET NULL;

-- Create team_members table for flexible team assignments
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('project', 'task') NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  role ENUM('owner', 'pic', 'member') DEFAULT 'member',
  added_by VARCHAR(50) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(username) ON DELETE CASCADE,
  UNIQUE KEY unique_team_member (item_type, item_id, username),
  INDEX idx_item (item_type, item_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create divisions table for better organization
CREATE TABLE IF NOT EXISTS divisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  division_code VARCHAR(50) UNIQUE NOT NULL,
  division_name VARCHAR(100) NOT NULL,
  division_type ENUM('division', 'brand', 'product', 'event') DEFAULT 'division',
  manager_username VARCHAR(50) DEFAULT NULL,
  direksi_username VARCHAR(50) DEFAULT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_username) REFERENCES users(username) ON DELETE SET NULL,
  FOREIGN KEY (direksi_username) REFERENCES users(username) ON DELETE SET NULL,
  INDEX idx_manager (manager_username),
  INDEX idx_direksi (direksi_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update projects table to include division and team visibility
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS visibility ENUM('private', 'division', 'manager', 'direksi', 'public') DEFAULT 'division';

-- Update tasks table to include division and team visibility
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS visibility ENUM('private', 'division', 'manager', 'direksi', 'public') DEFAULT 'division';

-- Insert default divisions (examples)
INSERT IGNORE INTO divisions (division_code, division_name, division_type, is_active) VALUES
('CREATIVE', 'Creative', 'division', 1),
('IT_SUPPORT', 'IT Support', 'division', 1),
('GA_SUPPORT', 'GA Support', 'division', 1),
('MARKETING', 'Marketing', 'brand', 1),
('PRODUCT_DEV', 'Product Development', 'product', 1);

-- Update existing users to have hierarchy_level based on role
UPDATE users SET hierarchy_level = 'owner' WHERE role = 'admin' AND username = 'wendra';
UPDATE users SET hierarchy_level = 'staff' WHERE hierarchy_level IS NULL OR hierarchy_level = '';

-- Sync existing job_position to division
UPDATE users SET division = job_position WHERE division IS NULL AND job_position IS NOT NULL;
