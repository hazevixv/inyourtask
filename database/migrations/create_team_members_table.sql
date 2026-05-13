-- Create team_members table for organizational unit team management
-- This allows employees to have multiple roles across different organizational units

CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_unit_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  role ENUM('member', 'lead', 'manager', 'pic', 'coordinator') DEFAULT 'member',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by VARCHAR(50),
  
  UNIQUE KEY unique_team_member (org_unit_id, username),
  FOREIGN KEY (org_unit_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(username) ON DELETE SET NULL,
  
  INDEX idx_org_unit (org_unit_id),
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_added_at (added_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment
ALTER TABLE team_members COMMENT = 'Team members for organizational units - allows multiple roles per employee';
