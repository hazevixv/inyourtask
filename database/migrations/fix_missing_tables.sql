-- ============================================
-- Fix missing tables for AI agents and roles
-- ============================================
-- Run this in MySQL to fix the 500 errors
-- ============================================

USE `ray-task_management`;

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  assigned_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (username, role_name),
  INDEX idx_username (username),
  INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create agent_role_assignments table if not exists
CREATE TABLE IF NOT EXISTS agent_role_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  assigned_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
  UNIQUE KEY unique_agent_role (agent_id, role_name),
  INDEX idx_agent_id (agent_id),
  INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DONE! Verify with:
-- SHOW TABLES LIKE 'user_roles';
-- SHOW TABLES LIKE 'agent_role_assignments';
-- ============================================
