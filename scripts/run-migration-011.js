// Run migration 011 via Node.js
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    multipleStatements: false,
  });

  const exec = async (sql, desc) => {
    try {
      await connection.execute(sql);
      console.log('OK:', desc);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column')) {
        console.log('SKIP (already exists):', desc);
      } else if (err.code === 'ER_DUP_KEYNAME' || err.message?.includes('duplicate key')) {
        console.log('SKIP (already exists):', desc);
      } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('SKIP (table exists):', desc);
      } else {
        console.error('ERROR:', err.message, '-', desc);
      }
    }
  };

  // Alter ai_agents table - add columns one by one with error handling
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN access_type ENUM('free','subscription','code') DEFAULT 'free' AFTER is_personal`,
    'Add access_type to ai_agents'
  );
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN subscription_plan_id INT NULL AFTER access_type`,
    'Add subscription_plan_id to ai_agents'
  );
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN is_public TINYINT(1) DEFAULT 0 AFTER subscription_plan_id`,
    'Add is_public to ai_agents'
  );
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN agent_code VARCHAR(100) NULL AFTER is_public`,
    'Add agent_code to ai_agents'
  );
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN max_activations INT DEFAULT -1 AFTER agent_code`,
    'Add max_activations to ai_agents'
  );
  await exec(
    `ALTER TABLE ai_agents ADD COLUMN current_activations INT DEFAULT 0 AFTER max_activations`,
    'Add current_activations to ai_agents'
  );

  // Create subscription_plans table (WITHOUT foreign keys first)
  await exec(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Create subscription_plans table');

  // Check existing table collations
  const [usersInfo] = await connection.execute(`SHOW CREATE TABLE users`);
  console.log('Users table:', usersInfo[0]['Create Table'].substring(0, 500) + '...');

  const [agentsInfo] = await connection.execute(`SHOW CREATE TABLE ai_agents`);
  console.log('ai_agents table:', agentsInfo[0]['Create Table'].substring(0, 500) + '...');

  // Create user_subscriptions table with matching collation
  await exec(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Create user_subscriptions table');

  // Create user_agent_assignments table with matching collation
  await exec(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Create user_agent_assignments table');

  // Add foreign keys separately
  await exec(
    `ALTER TABLE user_subscriptions ADD FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE`,
    'Add FK user_subscriptions.username -> users.username'
  );
  await exec(
    `ALTER TABLE user_subscriptions ADD FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE`,
    'Add FK user_subscriptions.plan_id -> subscription_plans.id'
  );
  await exec(
    `ALTER TABLE user_agent_assignments ADD FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE`,
    'Add FK user_agent_assignments.agent_id -> ai_agents.agent_id'
  );
  await exec(
    `ALTER TABLE user_agent_assignments ADD FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE`,
    'Add FK user_agent_assignments.username -> users.username'
  );

  // Add job_position to users if not exists
  await exec(
    `ALTER TABLE users ADD COLUMN job_position VARCHAR(100) NULL AFTER role`,
    'Add job_position to users'
  );

  // Insert default subscription plans
  await exec(`
    INSERT IGNORE INTO subscription_plans (id, name, description, price, duration_days, max_personal_ai, max_worker_ai, features, is_active) VALUES
    (1, 'Free', 'Free tier with limited personal AI. Max 3 Personal AI with llama-3.1-8b-instant model.', 0, 9999, 3, 0, '{"can_create_personal_ai":true,"personal_ai_model":"llama-3.1-8b-instant","max_personal_ai":3}', 1),
    (2, 'Basic', 'Basic plan with more personal AI and Worker AI access.', 50000, 30, 10, 5, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":10,"max_worker_ai":5}', 1),
    (3, 'Pro', 'Professional plan with unlimited AI access.', 150000, 30, -1, -1, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":-1,"max_worker_ai":-1}', 1)
  `, 'Insert default subscription plans');

  await connection.end();
  console.log('\n✓ Migration 011 completed successfully!');
}

main().catch(console.error);
