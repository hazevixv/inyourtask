/**
 * Fix Chat Tables Collation Issues
 * Drops foreign keys, converts collation, then recreates foreign keys
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixChatCollations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  try {
    console.log('🔧 Fixing chat tables collations...\n');

    // Step 1: Drop foreign keys
    console.log('1️⃣ Dropping foreign keys...');
    try {
      await connection.execute('ALTER TABLE chat_members DROP FOREIGN KEY chat_members_ibfk_1');
      console.log('   ✓ chat_members foreign key dropped');
    } catch (e) {
      console.log('   ⚠ chat_members foreign key not found or already dropped');
    }
    
    try {
      await connection.execute('ALTER TABLE chat_messages DROP FOREIGN KEY chat_messages_ibfk_1');
      console.log('   ✓ chat_messages foreign key dropped');
    } catch (e) {
      console.log('   ⚠ chat_messages foreign key not found or already dropped');
    }
    
    try {
      await connection.execute('ALTER TABLE ai_agent_memory DROP FOREIGN KEY ai_agent_memory_ibfk_1');
      console.log('   ✓ ai_agent_memory foreign key dropped');
    } catch (e) {
      console.log('   ⚠ ai_agent_memory foreign key not found or already dropped');
    }
    console.log('');

    // Step 2: Convert tables
    console.log('2️⃣ Converting tables to utf8mb4_unicode_ci...');
    
    const tables = ['chat_conversations', 'chat_members', 'chat_messages', 'ai_agent_memory'];
    for (const table of tables) {
      await connection.execute(`
        ALTER TABLE ${table} 
        CONVERT TO CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci
      `);
      console.log(`   ✓ ${table} converted`);
    }
    console.log('');

    // Step 3: Recreate foreign keys
    console.log('3️⃣ Recreating foreign keys...');
    
    await connection.execute(`
      ALTER TABLE chat_members 
      ADD CONSTRAINT chat_members_ibfk_1 
      FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) 
      ON DELETE CASCADE
    `);
    console.log('   ✓ chat_members foreign key');
    
    await connection.execute(`
      ALTER TABLE chat_messages 
      ADD CONSTRAINT chat_messages_ibfk_1 
      FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) 
      ON DELETE CASCADE
    `);
    console.log('   ✓ chat_messages foreign key');

    console.log('\n✅ Chat tables collation fixed!');
    console.log('All chat tables now use utf8mb4_unicode_ci with foreign keys restored');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

fixChatCollations();
