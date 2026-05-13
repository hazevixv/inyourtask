const mysql = require('mysql2/promise');

async function exec(connection, sql, desc) {
  try {
    await connection.execute(sql);
    console.log('  ✓', desc);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column')) {
      console.log('  - SKIP (exists):', desc);
    } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('  - SKIP (exists):', desc);
    } else if (err.code === 'ER_DUP_KEYNAME') {
      console.log('  - SKIP (exists):', desc);
    } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('  - SKIP (cant drop):', desc);
    } else {
      console.error('  ✗ ERROR:', err.message.substring(0, 100), '-', desc);
    }
  }
}

async function main() {
  console.log('Running Migration 012: Finalize AI Agent System\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    multipleStatements: false,
  });

  // 1. ai_agents columns
  console.log('1. ai_agents columns');
  const agentCols = [
    ['access_type', "ENUM('free','subscription','code') DEFAULT 'free' AFTER is_personal"],
    ['subscription_plan_id', 'INT NULL AFTER access_type'],
    ['is_public', "TINYINT(1) DEFAULT 0 AFTER subscription_plan_id"],
    ['agent_code', 'VARCHAR(100) NULL AFTER is_public'],
    ['max_activations', 'INT DEFAULT -1 AFTER agent_code'],
    ['current_activations', 'INT DEFAULT 0 AFTER max_activations'],
  ];
  for (const [col, def] of agentCols) {
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents' AND COLUMN_NAME = ?",
      [col]
    );
    if (rows[0].cnt === 0) {
      await exec(connection, `ALTER TABLE ai_agents ADD COLUMN ${col} ${def}`, `Add ${col}`);
    } else {
      console.log(`  - SKIP (exists): ${col}`);
    }
  }

  // 2. users columns
  console.log('\n2. users columns');
  const userCols = [
    ['job_position', 'VARCHAR(100) NULL AFTER role'],
    ['organization', 'VARCHAR(100) NULL AFTER job_position'],
  ];
  for (const [col, def] of userCols) {
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?",
      [col]
    );
    if (rows[0].cnt === 0) {
      await exec(connection, `ALTER TABLE users ADD COLUMN ${col} ${def}`, `Add ${col}`);
    } else {
      console.log(`  - SKIP (exists): ${col}`);
    }
  }

  // 3. subscription_plans
  console.log('\n3. subscription_plans table');
  await exec(connection, `
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
  `, 'Create subscription_plans');

  // 4. user_subscriptions
  console.log('\n4. user_subscriptions table');
  await exec(connection, `
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
  `, 'Create user_subscriptions');

  // 5. user_agent_assignments
  console.log('\n5. user_agent_assignments table');
  await exec(connection, `
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
  `, 'Create user_agent_assignments');

  // 6. FK constraints
  console.log('\n6. Foreign keys');
  const fks = [
    ['user_subscriptions', 'username', 'users(username)', 'user_subscriptions_ibfk_1'],
    ['user_subscriptions', 'plan_id', 'subscription_plans(id)', 'user_subscriptions_ibfk_2'],
    ['user_agent_assignments', 'agent_id', 'ai_agents(agent_id)', 'user_agent_assignments_ibfk_1'],
    ['user_agent_assignments', 'username', 'users(username)', 'user_agent_assignments_ibfk_2'],
  ];
  for (const [table, col, ref, constraint] of fks) {
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as cnt FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?",
      [table, constraint]
    );
    if (rows[0].cnt === 0) {
      try {
        await connection.execute(`ALTER TABLE ${table} ADD FOREIGN KEY (${col}) REFERENCES ${ref} ON DELETE CASCADE`);
        console.log(`  ✓ FK ${table}.${col} -> ${ref}`);
      } catch (err) {
        console.log(`  - SKIP FK ${table}.${col}: ${err.message.substring(0, 80)}`);
      }
    } else {
      console.log(`  - SKIP (exists): FK ${table}.${col}`);
    }
  }

  // 7. Seed plans
  console.log('\n7. Seed subscription plans');
  try {
    await connection.execute(`
      INSERT IGNORE INTO subscription_plans (id, name, description, price, duration_days, max_personal_ai, max_worker_ai, features, is_active) VALUES
      (1, 'Free', 'Gratis. Maksimal 3 Personal AI dengan model llama-3.1-8b-instant.', 0, 9999, 3, 0, '{"can_create_personal_ai":true,"personal_ai_model":"llama-3.1-8b-instant","max_personal_ai":3}', 1),
      (2, 'Basic', 'Basic. 10 Personal AI + 5 Worker AI, akses semua model.', 50000, 30, 10, 5, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":10,"max_worker_ai":5}', 1),
      (3, 'Pro', 'Pro. Unlimited AI!', 150000, 30, -1, -1, '{"can_create_personal_ai":true,"personal_ai_model":"any","max_personal_ai":-1,"max_worker_ai":-1}', 1)
    `);
    console.log('  ✓ Seeded 3 subscription plans');
  } catch (err) {
    console.log(`  - ${err.message.substring(0, 80)}`);
  }

  // 8. chat_sessions table
  console.log('\n8. chat_sessions table');
  await exec(connection, `
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Create chat_sessions');

  await connection.end();
  console.log('\n✓ Migration 012 completed successfully!');
}

main().catch(console.error);
