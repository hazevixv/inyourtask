/**
 * Setup Complete Chat System
 * 1. Create chat tables
 * 2. Seed AI agents
 * 3. Verify everything works
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    // Step 1: Create chat tables
    console.log('📋 Step 1: Creating chat tables...\n');
    
    // AI Agents Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) UNIQUE NOT NULL,
        workspace_id VARCHAR(20) NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        role VARCHAR(100) NULL,
        system_prompt TEXT NOT NULL,
        knowledge_base TEXT NULL,
        model VARCHAR(50) DEFAULT 'gemini-2.0-flash-exp',
        is_active TINYINT DEFAULT 1,
        is_personal TINYINT DEFAULT 0,
        owner_username VARCHAR(100) NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_active (is_active),
        INDEX idx_personal (is_personal, owner_username),
        INDEX idx_workspace_id (workspace_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ ai_agents table created');

    // Chat Conversations Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conv_id VARCHAR(50) UNIQUE NOT NULL,
        workspace_id VARCHAR(20) NULL,
        type ENUM('direct', 'group', 'ai_agent', 'ai_personal') NOT NULL,
        name VARCHAR(255) NULL,
        description TEXT NULL,
        avatar VARCHAR(255) NULL,
        created_by VARCHAR(100) NOT NULL,
        agent_id VARCHAR(50) NULL,
        is_archived TINYINT DEFAULT 0,
        last_message TEXT NULL,
        last_msg_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_type (type),
        INDEX idx_agent (agent_id),
        INDEX idx_created_by (created_by),
        INDEX idx_last_msg (last_msg_at DESC),
        INDEX idx_workspace_id (workspace_id),
        
        FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ chat_conversations table created');

    // Chat Members Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conv_id VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT 'member',
        last_read_at DATETIME NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_member (conv_id, username),
        INDEX idx_username (username),
        INDEX idx_conv (conv_id),
        INDEX idx_last_read (last_read_at),
        
        FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ chat_members table created');

    // Chat Messages Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        msg_id VARCHAR(50) UNIQUE NOT NULL,
        conv_id VARCHAR(50) NOT NULL,
        sender VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        msg_type ENUM('text', 'image', 'file', 'system', 'ai') DEFAULT 'text',
        reply_to VARCHAR(50) NULL,
        is_edited TINYINT DEFAULT 0,
        is_deleted TINYINT DEFAULT 0,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_conv (conv_id),
        INDEX idx_sender (sender),
        INDEX idx_created (created_at DESC),
        INDEX idx_deleted (is_deleted),
        
        FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ chat_messages table created');

    // AI Agent Memory Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_agent_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        memory_key VARCHAR(100) NOT NULL,
        memory_value TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_memory (agent_id, username, memory_key),
        INDEX idx_agent_user (agent_id, username),
        
        FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ ai_agent_memory table created\n');

    // Step 2: Seed AI Agents
    console.log('📋 Step 2: Seeding AI agents...\n');

    const agents = [
      {
        agent_id: 'agent-content-writer',
        name: 'Content Writer AI',
        description: 'Expert in creating engaging content, blog posts, and marketing copy.',
        role: 'Content Writer',
        system_prompt: 'You are a professional content writer with expertise in SEO, storytelling, and engaging copy. Help users create compelling content. Always provide creative, well-structured content. Respond in Indonesian when user speaks Indonesian, English when user speaks English.',
        knowledge_base: 'Content writing best practices: Hook readers, use clear language, include keywords naturally, structure with headers, use storytelling, end with CTA, proofread, optimize readability, include data, write in active voice.'
      },
      {
        agent_id: 'agent-data-analyst',
        name: 'Data Analyst AI',
        description: 'Specialized in data analysis, visualization, and insights.',
        role: 'Data Analyst',
        system_prompt: 'You are a data analyst expert who helps users understand data and extract actionable insights. Provide clear explanations and practical recommendations. Respond in Indonesian when user speaks Indonesian, English when user speaks English.',
        knowledge_base: 'Data analysis principles: Start with EDA, check data quality, use appropriate methods, visualize clearly, provide actionable recommendations, consider correlation vs causation, document assumptions.'
      },
      {
        agent_id: 'agent-developer',
        name: 'Developer AI',
        description: 'Expert in software development, debugging, and code review.',
        role: 'Software Developer',
        system_prompt: 'You are an experienced software developer. Help users with code problems, architecture, debugging, and best practices. Provide clean, well-documented code examples. Respond in Indonesian when user speaks Indonesian, English when user speaks English.',
        knowledge_base: 'Development best practices: Write clean code, follow SOLID principles, test thoroughly, document code, consider security, optimize performance, use version control, handle errors gracefully.'
      },
      {
        agent_id: 'agent-project-manager',
        name: 'Project Manager AI',
        description: 'Helps with project planning, task management, and team coordination.',
        role: 'Project Manager',
        system_prompt: 'You are an experienced project manager. Help users plan projects, manage tasks, and coordinate teams. Provide practical advice on methodologies and risk management. Respond in Indonesian when user speaks Indonesian, English when user speaks English.',
        knowledge_base: 'Project management principles: Define clear objectives, break down tasks, set realistic timelines, identify risks, communicate regularly, track progress, manage resources, document decisions.'
      }
    ];

    for (const agent of agents) {
      try {
        await connection.execute(`
          INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, knowledge_base, model, is_active, is_personal, created_by)
          VALUES (?, NULL, ?, ?, ?, ?, ?, 'gemini-2.0-flash-exp', 1, 0, 'system')
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            role = VALUES(role),
            system_prompt = VALUES(system_prompt),
            knowledge_base = VALUES(knowledge_base),
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        `, [agent.agent_id, agent.name, agent.description, agent.role, agent.system_prompt, agent.knowledge_base]);
        
        console.log(`   ✅ ${agent.name} - ${agent.role}`);
      } catch (err) {
        console.error(`   ❌ Error seeding ${agent.name}: ${err.message}`);
      }
    }

    console.log('\n📋 Step 3: Verifying AI agents...\n');
    
    const [agentsList] = await connection.execute(`
      SELECT agent_id, name, role, is_active, model
      FROM ai_agents
      WHERE is_personal = 0
      ORDER BY name
    `);

    console.log('   AI Agents Available:');
    console.log('   ─────────────────────────────────────────────────────────────');
    agentsList.forEach(agent => {
      console.log(`   ✅ ${agent.name.padEnd(25)} (${agent.role})`);
      console.log(`      ID: ${agent.agent_id}`);
      console.log(`      Model: ${agent.model}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🎉 CHAT SYSTEM READY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('✅ Chat Tables Created:');
    console.log('   - ai_agents');
    console.log('   - chat_conversations');
    console.log('   - chat_members');
    console.log('   - chat_messages');
    console.log('   - ai_agent_memory\n');
    
    console.log('✅ AI Agents Seeded:');
    console.log('   - Content Writer AI');
    console.log('   - Data Analyst AI');
    console.log('   - Developer AI');
    console.log('   - Project Manager AI\n');
    
    console.log('🚀 Ready to use!');
    console.log('   Start server: npm run dev');
    console.log('   Go to: http://localhost:3005/chat');
    console.log('   Click "New Chat" → Select AI Agent\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

main();
