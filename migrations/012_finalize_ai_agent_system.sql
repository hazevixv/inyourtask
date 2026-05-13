-- ============================================
-- MIGRATION 012: FINALIZE AI AGENT SYSTEM
-- ============================================
-- Ensures all tables and columns for the AI agent
-- subscription & deploy system exist correctly.
-- Date: 2026-05-13
-- ============================================

-- 1. Ensure ai_agents columns exist
DROP PROCEDURE IF EXISTS EnsureAiAgentCols;
DELIMITER //
CREATE PROCEDURE EnsureAiAgentCols()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'access_type') THEN
    ALTER TABLE ai_agents ADD COLUMN access_type ENUM('free','subscription','code') DEFAULT 'free' AFTER is_personal;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'subscription_plan_id') THEN
    ALTER TABLE ai_agents ADD COLUMN subscription_plan_id INT NULL AFTER access_type;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'is_public') THEN
    ALTER TABLE ai_agents ADD COLUMN is_public TINYINT(1) DEFAULT 0 AFTER subscription_plan_id;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'agent_code') THEN
    ALTER TABLE ai_agents ADD COLUMN agent_code VARCHAR(100) NULL AFTER is_public;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'max_activations') THEN
    ALTER TABLE ai_agents ADD COLUMN max_activations INT DEFAULT -1 AFTER agent_code;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = 'current_activations') THEN
    ALTER TABLE ai_agents ADD COLUMN current_activations INT DEFAULT 0 AFTER max_activations;
  END IF;
END //
DELIMITER ;
CALL EnsureAiAgentCols();
DROP PROCEDURE EnsureAiAgentCols;

-- 2. Ensure users.organization column exists
DROP PROCEDURE IF EXISTS EnsureUsersOrg;
DELIMITER //
CREATE PROCEDURE EnsureUsersOrg()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'organization') THEN
    ALTER TABLE users ADD COLUMN organization VARCHAR(100) NULL AFTER job_position;
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'job_position') THEN
    ALTER TABLE users ADD COLUMN job_position VARCHAR(100) NULL AFTER role;
  END IF;
END //
DELIMITER ;
CALL EnsureUsersOrg();
DROP PROCEDURE EnsureUsersOrg;

-- 3. Ensure subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) DEFAULT 0,
  duration_days INT DEFAULT 30,
  max_personal_ai INT DEFAULT -1,
  max_worker_ai INT DEFAULT -1,
  features JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Ensure user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  plan_id INT NOT NULL,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  auto_renew TINYINT(1) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_ref VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_plan_id (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Ensure user_agent_assignments table
CREATE TABLE IF NOT EXISTS user_agent_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  username VARCHAR(50) NOT NULL,
  access_type ENUM('free','subscription','code') DEFAULT 'free',
  activation_code VARCHAR(100) NULL,
  is_approved TINYINT(1) DEFAULT 0,
  assigned_by VARCHAR(50),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  is_active TINYINT(1) DEFAULT 1,
  UNIQUE KEY unique_agent_user (agent_id, username),
  INDEX idx_agent_id (agent_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add foreign keys (ignore errors if they already exist)
-- user_subscriptions
ALTER TABLE user_subscriptions ADD FOREIGN KEY IF NOT EXISTS (username) REFERENCES users(username) ON DELETE CASCADE;
ALTER TABLE user_subscriptions ADD FOREIGN KEY IF NOT EXISTS (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE;

-- user_agent_assignments
ALTER TABLE user_agent_assignments ADD FOREIGN KEY IF NOT EXISTS (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE;
ALTER TABLE user_agent_assignments ADD FOREIGN KEY IF NOT EXISTS (username) REFERENCES users(username) ON DELETE CASCADE;

-- 7. Seed default subscription plans (if empty)
INSERT IGNORE INTO subscription_plans (id, name, description, price, duration_days, max_personal_ai, max_worker_ai, features, is_active) VALUES
(1, 'Free', 'Gratis. Maksimal 3 Personal AI dengan model llama-3.1-8b-instant.', 0, 9999, 3, 0, '{"can_create_personal_ai":true,"personal_ai_model":"llama-3.1-8b-instant","max_personal_ai":3}', 1),
(2, 'Basic', 'Basic. 10 Personal AI + 5 Worker AI, akses semua model.', 50000, 30, 10, 5, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":10,"max_worker_ai":5}', 1),
(3, 'Pro', 'Pro. Unlimited AI!', 150000, 30, -1, -1, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":-1,"max_worker_ai":-1}', 1);

-- 8. Ensure chat_sessions table (migration 008)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  conv_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) DEFAULT 'General Chat',
  message_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conv_id (conv_id),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 012 completed successfully' AS status;
