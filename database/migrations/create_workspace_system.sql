-- ============================================
-- Create workspace system tables
-- Multi-workspace foundation for Raymaizing Task
-- ============================================
-- Run this once against the active MySQL database.
-- The app can safely bootstrap per-user workspaces on first login.
-- ============================================

USE `ray-task_management`;

CREATE TABLE IF NOT EXISTS workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('personal','team','company') NOT NULL DEFAULT 'team',
  owner_username VARCHAR(50) NULL,
  created_by VARCHAR(50) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner_username (owner_username),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  username VARCHAR(50) NOT NULL,
  role ENUM('owner','admin','manager','member','guest') NOT NULL DEFAULT 'member',
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  joined_by VARCHAR(50) NULL,
  UNIQUE KEY unique_workspace_member (workspace_id, username),
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_username (username),
  INDEX idx_role (role),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invite_code VARCHAR(80) NOT NULL UNIQUE,
  workspace_id VARCHAR(20) NOT NULL,
  email VARCHAR(100) NULL,
  role ENUM('owner','admin','manager','member','guest') NOT NULL DEFAULT 'member',
  invited_by VARCHAR(50) NOT NULL,
  expires_at DATETIME NULL,
  accepted_by VARCHAR(50) NULL,
  accepted_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_invited_by (invited_by),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  role_label VARCHAR(100) NOT NULL,
  role_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO workspace_roles (role_name, role_label, role_order) VALUES
  ('owner', 'Owner', 1),
  ('admin', 'Admin', 2),
  ('manager', 'Manager', 3),
  ('member', 'Member', 4),
  ('guest', 'Guest', 5);
