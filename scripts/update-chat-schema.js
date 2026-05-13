const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateChatSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔄 Updating chat_messages table...');
    
    // Check if columns already exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages'
    `, [process.env.DB_NAME || 'ray-task_management']);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    // Add attachments column if not exists
    if (!existingColumns.includes('attachments')) {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN attachments JSON DEFAULT NULL
      `);
      console.log('✅ Added attachments column');
    } else {
      console.log('⏭️  attachments column already exists');
    }
    
    // Add voice_data column if not exists
    if (!existingColumns.includes('voice_data')) {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN voice_data JSON DEFAULT NULL
      `);
      console.log('✅ Added voice_data column');
    } else {
      console.log('⏭️  voice_data column already exists');
    }
    
    // Add render_type column if not exists
    if (!existingColumns.includes('render_type')) {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN render_type ENUM('text', 'markdown', 'html', 'code', 'chart', '3d') DEFAULT 'text'
      `);
      console.log('✅ Added render_type column');
    } else {
      console.log('⏭️  render_type column already exists');
    }
    
    // Add metadata column if not exists (might already exist)
    if (!existingColumns.includes('metadata')) {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN metadata JSON DEFAULT NULL
      `);
      console.log('✅ Added metadata column');
    } else {
      console.log('⏭️  metadata column already exists');
    }
    
    console.log('\n🔄 Creating message_reactions table...');
    
    // Create message_reactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        msg_id VARCHAR(36) NOT NULL,
        username VARCHAR(50) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reaction (msg_id, username, emoji),
        FOREIGN KEY (msg_id) REFERENCES chat_messages(msg_id) ON DELETE CASCADE,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ message_reactions table created');
    
    console.log('\n🔄 Creating system_config table...');
    
    // Create system_config table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ system_config table created');
    
    console.log('\n✅ Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateChatSchema().catch(console.error);
