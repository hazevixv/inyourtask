const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
};

async function migrate() {
  let connection;
  
  try {
    console.log('🚀 Starting authentication migration...\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL server');
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role ENUM('admin', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created users table');
    
    // Create sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (session_token),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created sessions table');
    
    // Create ai_conversations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        session_name VARCHAR(255) DEFAULT 'New Conversation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_session (user_id, session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created ai_conversations table');
    
    // Create ai_messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation (conversation_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created ai_messages table');
    
    // Insert default users
    await connection.query(`
      INSERT IGNORE INTO users (username, password, full_name, email, role) VALUES
      ('admin', 'admin123', 'Administrator', 'admin@rayacademy.com', 'admin'),
      ('taufik', 'taufik123', 'Taufik', 'taufik@rayacademy.com', 'user'),
      ('iman', 'iman123', 'Iman', 'iman@rayacademy.com', 'user')
    `);
    console.log('✅ Default users inserted');
    
    // Check and add columns to existing tables
    const [brainColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'brain_config' AND COLUMN_NAME = 'user_id'
    `, [DB_CONFIG.database]);
    
    if (brainColumns.length === 0) {
      await connection.query('ALTER TABLE brain_config ADD COLUMN user_id INT NULL');
      console.log('✅ Added user_id to brain_config');
    }
    
    const [projectColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'created_by'
    `, [DB_CONFIG.database]);
    
    if (projectColumns.length === 0) {
      await connection.query('ALTER TABLE projects ADD COLUMN created_by INT NULL');
      console.log('✅ Added created_by to projects');
    }
    
    const [taskColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'created_by'
    `, [DB_CONFIG.database]);
    
    if (taskColumns.length === 0) {
      await connection.query('ALTER TABLE tasks ADD COLUMN created_by INT NULL');
      console.log('✅ Added created_by to tasks');
    }
    
    // Verify tables
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name IN ('users', 'sessions', 'ai_conversations', 'ai_messages')
    `, [DB_CONFIG.database]);
    
    console.log('\n📊 New tables in database:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    console.log('\n🎉 Authentication migration completed successfully!');
    console.log('\n📝 You can now login with:');
    console.log('   Username: taufik | Password: taufik123');
    console.log('   Username: iman | Password: iman123');
    console.log('   Username: admin | Password: admin123');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

migrate();
