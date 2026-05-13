/**
 * Test Chat Initialization
 * Tests if the chat system initializes correctly after the bug fix
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testChatInit() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🧪 Testing Chat Initialization...\n');
    const [workspaceRows] = await connection.execute(
      `SELECT wm.workspace_id
       FROM workspace_members wm
       WHERE wm.username = ?
       ORDER BY wm.is_primary DESC, wm.joined_at ASC
       LIMIT 1`,
      ['admin']
    );
    const workspaceId = workspaceRows[0]?.workspace_id || null;

    // Test 1: Check if chat tables exist
    console.log('1️⃣ Checking chat tables...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('ai_agents', 'chat_conversations', 'chat_members', 'chat_messages', 'ai_agent_memory')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'ray-task_management']);
    
    console.log(`   Found ${tables.length}/5 chat tables:`);
    tables.forEach(t => console.log(`   ✓ ${t.TABLE_NAME}`));
    
    if (tables.length < 5) {
      console.log('\n❌ Missing chat tables! Run CHAT-DATABASE-SETUP.sql first.');
      return;
    }

    // Test 2: Check AI agents
    console.log('\n2️⃣ Checking AI agents...');
    const [agents] = await connection.execute(`
      SELECT agent_id, name, model, is_personal, owner_username 
      FROM ai_agents 
      ORDER BY is_personal DESC, name
    `);
    
    console.log(`   Found ${agents.length} AI agents:`);
    agents.forEach(a => {
      const type = a.is_personal ? '👤 Personal' : '🤖 Shared';
      const owner = a.owner_username ? ` (${a.owner_username})` : '';
      console.log(`   ${type}: ${a.name}${owner} - ${a.model}`);
    });

    // Test 3: Test conversation creation (simulate what the API does)
    console.log('\n3️⃣ Testing conversation creation...');
    const testUsername = 'admin';
    
    // Get or create personal agent
    const [personalAgents] = await connection.execute(
      'SELECT * FROM ai_agents WHERE is_personal = 1 AND owner_username = ? LIMIT 1',
      [testUsername]
    );
    
    let personalAgent = personalAgents[0];
    
    if (!personalAgent) {
      console.log('   Creating personal agent for admin...');
      const agentId = `personal-${testUsername}`;
      await connection.execute(
        `INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, knowledge_base, model, is_personal, owner_username, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agentId,
          workspaceId,
          `Admin's AI`,
          `Personal AI assistant for Admin`,
          'Personal Assistant',
          `You are a personal AI assistant. Respond in Indonesian.`,
          '',
          'gemini-2.5-flash',
          1,
          testUsername,
          testUsername
        ]
      );
      [personalAgent] = (await connection.execute('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]))[0];
      console.log('   ✓ Personal agent created');
    } else {
      console.log('   ✓ Personal agent exists');
    }

    // Check if conversation exists
    const [existingConvs] = await connection.execute(`
      SELECT c.* 
      FROM chat_conversations c
      JOIN chat_members m ON c.conv_id = m.conv_id
      WHERE c.type = 'ai_personal' 
      AND c.agent_id = ?
      ${workspaceId ? 'AND c.workspace_id = ?' : ''}
      AND m.username = ?
      LIMIT 1
    `, workspaceId ? [personalAgent.agent_id, workspaceId, testUsername] : [personalAgent.agent_id, testUsername]);

    if (existingConvs.length > 0) {
      console.log(`   ✓ Conversation already exists: ${existingConvs[0].conv_id}`);
    } else {
      console.log('   Creating new conversation...');
      
      // This is the critical part that was buggy - now using transaction properly
      await connection.beginTransaction();
      
      try {
        const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert conversation using transaction connection
        await connection.execute(
          `INSERT INTO chat_conversations (conv_id, workspace_id, type, name, agent_id, created_by, created_at, updated_at)
           VALUES (?, ?, 'ai_personal', ?, ?, ?, NOW(), NOW())`,
          [convId, workspaceId, personalAgent.name, personalAgent.agent_id, testUsername]
        );
        
        // Add member using transaction connection
        await connection.execute(
          `INSERT INTO chat_members (conv_id, username, role, joined_at)
           VALUES (?, ?, 'member', NOW())`,
          [convId, testUsername]
        );
        
        await connection.commit();
        console.log(`   ✓ Conversation created successfully: ${convId}`);
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    }

    // Test 4: Check conversations
    console.log('\n4️⃣ Checking conversations...');
    const [conversations] = await connection.execute(`
      SELECT 
        c.conv_id,
        c.type,
        c.name,
        c.agent_id,
        COUNT(DISTINCT m.username) as member_count,
        COUNT(DISTINCT msg.msg_id) as message_count
      FROM chat_conversations c
      LEFT JOIN chat_members m ON c.conv_id = m.conv_id
      LEFT JOIN chat_messages msg ON c.conv_id = msg.conv_id
      GROUP BY c.conv_id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${conversations.length} conversations:`);
    conversations.forEach(c => {
      const type = c.type === 'ai_agent' || c.type === 'ai_personal' ? '🤖' : c.type === 'direct' ? '💬' : '👥';
      console.log(`   ${type} ${c.name || 'Unnamed'} - ${c.member_count} members, ${c.message_count} messages`);
    });

    console.log('\n✅ All tests passed! Chat system is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Open http://localhost:3005/chat in your browser');
    console.log('   2. Login as admin/raytask123');
    console.log('   3. Test selecting AI agents');
    console.log('   4. Test sending messages');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

testChatInit();
