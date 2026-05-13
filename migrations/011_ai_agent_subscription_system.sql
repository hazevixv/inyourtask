-- ============================================
-- MIGRATION 011: AI AGENT SUBSCRIPTION & DEPLOY SYSTEM
-- ============================================
-- Purpose: Add subscription plans, user subscriptions, user-agent assignments
--          and modify ai_agents table for access control
-- Date: 2026-05-13
-- ============================================

-- 1. Modify ai_agents table - add access control columns (MySQL 8.0 compatible)
DROP PROCEDURE IF EXISTS AlterAiAgents;
DELIMITER //
CREATE PROCEDURE AlterAiAgents()
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
CALL AlterAiAgents();
DROP PROCEDURE AlterAiAgents;

-- 2. Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) DEFAULT 0,
  duration_days INT DEFAULT 30,
  max_personal_ai INT DEFAULT -1 COMMENT '-1 = unlimited',
  max_worker_ai INT DEFAULT -1 COMMENT '-1 = unlimited',
  features JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create user_subscriptions table
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
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create user_agent_assignments table
CREATE TABLE IF NOT EXISTS user_agent_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  username VARCHAR(50) NOT NULL,
  access_type ENUM('free','subscription','code') DEFAULT 'free',
  activation_code VARCHAR(100) NULL,
  is_approved TINYINT(1) DEFAULT 0 COMMENT '0=pending, 1=approved, -1=rejected',
  assigned_by VARCHAR(50),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  UNIQUE KEY unique_agent_user (agent_id, username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Seed default subscription plans
INSERT IGNORE INTO subscription_plans (id, name, description, price, duration_days, max_personal_ai, max_worker_ai, features, is_active) VALUES
(1, 'Free', 'Free tier with limited personal AI. Max 3 Personal AI with llama-3.1-8b-instant model.', 0, 9999, 3, 0, '{"can_create_personal_ai":true,"personal_ai_model":"llama-3.1-8b-instant","max_personal_ai":3}', 1),
(2, 'Basic', 'Basic plan with more personal AI and Worker AI access.', 50000, 30, 10, 5, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":10,"max_worker_ai":5}', 1),
(3, 'Pro', 'Professional plan with unlimited AI access.', 150000, 30, -1, -1, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":-1,"max_worker_ai":-1}', 1);

-- 6. Add job_position column to users if not exists
DROP PROCEDURE IF EXISTS AlterUsers;
DELIMITER //
CREATE PROCEDURE AlterUsers()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'job_position') THEN
    ALTER TABLE users ADD COLUMN job_position VARCHAR(100) NULL AFTER role;
  END IF;
END //
DELIMITER ;
CALL AlterUsers();
DROP PROCEDURE AlterUsers;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration 011 completed successfully' AS status;
