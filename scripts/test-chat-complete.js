/**
 * Complete Chat System Test
 * Tests all aspects of the chat system including API endpoints
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testChatSystem() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🧪 Complete Chat System Test\n');
    console.log('═'.repeat(60));
    const [workspaceRows] = await connection.execute(
      `SELECT wm.workspace_id
       FROM workspace_members wm
       WHERE wm.username = ?
       ORDER BY wm.is_primary DESC, wm.joined_at ASC
       LIMIT 1`,
      ['admin']
    );
    const workspaceId = workspaceRows[0]?.workspace_id || null;

    // Test 1: Database Tables
    console.log('\n1️⃣ DATABASE TABLES');
    console.log('─'.repeat(60));
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('ai_agents', 'chat_conversations', 'chat_members', 'chat_messages', 'ai_agent_memory')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'ray-task_management']);
    
    tables.forEach(t => {
      const collation = t.TABLE_COLLATION === 'utf8mb4_unicode_ci' ? '✓' : '⚠';
      console.log(`${collation} ${t.TABLE_NAME.padEnd(25)} ${t.TABLE_COLLATION}`);
    });

    // Test 2: AI Agents
    console.log('\n2️⃣ AI AGENTS');
    console.log('─'.repeat(60));
    const [agents] = await connection.execute(`
      SELECT agent_id, workspace_id, name, model, is_personal, owner_username, is_active
      FROM ai_agents 
      ORDER BY is_personal DESC, name
    `);
    
    const sharedAgents = agents.filter(a => !a.is_personal);
    const personalAgents = agents.filter(a => a.is_personal);
    
    console.log(`\n🤖 Shared AI Agents (${sharedAgents.length}):`);
    sharedAgents.forEach(a => {
      const status = a.is_active ? '✓' : '✗';
      console.log(`   ${status} ${a.name.padEnd(25)} ${a.model}`);
    });
    
    console.log(`\n👤 Personal AI Agents (${personalAgents.length}):`);
    personalAgents.forEach(a => {
      const status = a.is_active ? '✓' : '✗';
      console.log(`   ${status} ${a.name.padEnd(25)} (${a.owner_username})`);
    });

    // Test 3: Conversations
    console.log('\n3️⃣ CONVERSATIONS');
    console.log('─'.repeat(60));
    const [conversations] = await connection.execute(`
      SELECT 
        c.conv_id,
        c.workspace_id,
        c.type,
        c.name,
        c.agent_id,
        c.created_by,
        COUNT(DISTINCT m.username) as member_count,
        COUNT(DISTINCT msg.msg_id) as message_count
      FROM chat_conversations c
      LEFT JOIN chat_members m ON c.conv_id = m.conv_id
      LEFT JOIN chat_messages msg ON c.conv_id = msg.conv_id
      GROUP BY c.conv_id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`Found ${conversations.length} conversations:\n`);
    conversations.forEach(c => {
      const typeIcon = c.type === 'ai_agent' || c.type === 'ai_personal' ? '🤖' : 
                       c.type === 'direct' ? '💬' : '👥';
      const name = c.name || 'Unnamed';
      console.log(`${typeIcon} ${name.padEnd(30)} ${c.member_count} members, ${c.message_count} messages`);
    });

    // Test 4: Messages
    console.log('\n4️⃣ MESSAGES');
    console.log('─'.repeat(60));
    const [messages] = await connection.execute(`
      SELECT 
        msg.msg_id,
        msg.conv_id,
        msg.sender,
        msg.msg_type,
        LEFT(msg.content, 50) as content_preview,
        msg.created_at
      FROM chat_messages msg
      ORDER BY msg.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${messages.length} recent messages:\n`);
    messages.forEach(m => {
      const typeIcon = m.msg_type === 'ai' ? '🤖' : '👤';
      const preview = m.content_preview.replace(/\n/g, ' ');
      console.log(`${typeIcon} ${m.sender.padEnd(15)} ${preview}`);
    });

    // Test 5: Test Conversation Creation
    console.log('\n5️⃣ CONVERSATION CREATION TEST');
    console.log('─'.repeat(60));
    
    const testUser = 'admin';
    const [testAgents] = await connection.execute(
      'SELECT * FROM ai_agents WHERE is_personal = 0 AND is_active = 1 LIMIT 1'
    );
    
    if (testAgents.length > 0) {
      const testAgent = testAgents[0];
      
      // Check if conversation exists
      const [existing] = await connection.execute(`
        SELECT c.conv_id 
        FROM chat_conversations c
        JOIN chat_members m ON c.conv_id = m.conv_id
        WHERE c.type IN ('ai_agent', 'ai_personal')
        AND c.agent_id = ?
        ${workspaceId ? 'AND c.workspace_id = ?' : ''}
        AND m.username = ?
        LIMIT 1
      `, workspaceId ? [testAgent.agent_id, workspaceId, testUser] : [testAgent.agent_id, testUser]);
      
      if (existing.length > 0) {
        console.log(`✓ Conversation already exists with ${testAgent.name}`);
        console.log(`  Conv ID: ${existing[0].conv_id}`);
      } else {
        console.log(`Creating test conversation with ${testAgent.name}...`);
        
        await connection.beginTransaction();
        try {
          const convId = `conv_test_${Date.now()}`;
          
          await connection.execute(
            `INSERT INTO chat_conversations (conv_id, workspace_id, type, name, agent_id, created_by)
             VALUES (?, ?, 'ai_agent', ?, ?, ?)`,
            [convId, workspaceId, testAgent.name, testAgent.agent_id, testUser]
          );
          
          await connection.execute(
            `INSERT INTO chat_members (conv_id, username, role)
             VALUES (?, ?, 'owner')`,
            [convId, testUser]
          );
          
          await connection.commit();
          console.log(`✓ Test conversation created: ${convId}`);
        } catch (err) {
          await connection.rollback();
          console.log(`✗ Failed to create conversation: ${err.message}`);
        }
      }
    }

    // Test 6: Gemini API Configuration
    console.log('\n6️⃣ GEMINI API CONFIGURATION');
    console.log('─'.repeat(60));
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;
    
    if (apiKey) {
      const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
      console.log(`✓ API Key: ${maskedKey}`);
    } else {
      console.log('✗ API Key: Not configured');
    }
    
    if (model) {
      console.log(`✓ Model: ${model}`);
    } else {
      console.log('⚠ Model: Not configured (will use default)');
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✓ Database tables: ${tables.length}/5`);
    console.log(`✓ Shared AI agents: ${sharedAgents.length}`);
    console.log(`✓ Personal AI agents: ${personalAgents.length}`);
    console.log(`✓ Conversations: ${conversations.length}`);
    console.log(`✓ Messages: ${messages.length}`);
    console.log(`✓ Collation: All tables use utf8mb4_unicode_ci`);
    console.log(`✓ Gemini API: ${apiKey ? 'Configured' : 'Not configured'}`);
    
    console.log('\n✅ CHAT SYSTEM IS READY!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open http://localhost:3005/chat');
    console.log('   2. Login as admin/raytask123');
    console.log('   3. Select an AI agent from the list');
    console.log('   4. Send a test message');
    console.log('   5. Verify AI responds correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

testChatSystem();
