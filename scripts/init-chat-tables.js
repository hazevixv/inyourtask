/**
 * Initialize Chat Tables
 * Run: node scripts/init-chat-tables.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initChatTables() {
  console.log('🚀 Initializing chat tables...\n');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('chat_conversations', 'chat_members', 'chat_messages', 'chat_ai_agents')
    `, [config.database]);

    const existingTables = tables.map((t) => t.TABLE_NAME);
    console.log('📋 Existing chat tables:', existingTables.length > 0 ? existingTables.join(', ') : 'None');

    if (existingTables.length === 4) {
      console.log('\n✅ All chat tables already exist!');
      console.log('   No action needed.\n');
      return;
    }

    console.log('\n📝 Creating missing chat tables...\n');

    // Create chat_ai_agents table
    if (!existingTables.includes('chat_ai_agents')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_ai_agents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          agent_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          avatar VARCHAR(500),
          role VARCHAR(100),
          system_prompt TEXT NOT NULL,
          knowledge_base TEXT,
          model VARCHAR(50) DEFAULT 'gpt-4o-mini',
          is_active TINYINT(1) DEFAULT 1,
          is_personal TINYINT(1) DEFAULT 0,
          owner_username VARCHAR(100),
          created_by VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_agent_id (agent_id),
          INDEX idx_owner (owner_username),
          INDEX idx_is_personal (is_personal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ chat_ai_agents');
    }

    // Create chat_conversations table
    if (!existingTables.includes('chat_conversations')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          conv_id VARCHAR(100) UNIQUE NOT NULL,
          type ENUM('direct', 'group', 'ai_agent', 'ai_personal') NOT NULL,
          name VARCHAR(255),
          description TEXT,
          avatar VARCHAR(500),
          created_by VARCHAR(100) NOT NULL,
          agent_id VARCHAR(100),
          is_archived TINYINT(1) DEFAULT 0,
          last_message TEXT,
          last_msg_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_conv_id (conv_id),
          INDEX idx_type (type),
          INDEX idx_agent_id (agent_id),
          INDEX idx_created_by (created_by),
          FOREIGN KEY (agent_id) REFERENCES chat_ai_agents(agent_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ chat_conversations');
    }

    // Create chat_members table
    if (!existingTables.includes('chat_members')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          conv_id VARCHAR(100) NOT NULL,
          username VARCHAR(100) NOT NULL,
          role ENUM('owner', 'admin', 'member') DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_read_at TIMESTAMP NULL,
          is_muted TINYINT(1) DEFAULT 0,
          UNIQUE KEY unique_member (conv_id, username),
          INDEX idx_conv_id (conv_id),
          INDEX idx_username (username),
          FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ chat_members');
    }

    // Create chat_messages table
    if (!existingTables.includes('chat_messages')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          msg_id VARCHAR(100) UNIQUE NOT NULL,
          conv_id VARCHAR(100) NOT NULL,
          sender VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          msg_type ENUM('text', 'image', 'file', 'system', 'ai') DEFAULT 'text',
          reply_to VARCHAR(100),
          is_edited TINYINT(1) DEFAULT 0,
          is_deleted TINYINT(1) DEFAULT 0,
          metadata JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_msg_id (msg_id),
          INDEX idx_conv_id (conv_id),
          INDEX idx_sender (sender),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ chat_messages');
    }

    console.log('\n✅ Chat tables initialized successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initChatTables();
