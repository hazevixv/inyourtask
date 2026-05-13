const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'ray-task_management';

const MIGRATION_SQL = `
-- Create Database
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE \`${DB_NAME}\`;

-- Table: brain_config (Central Configuration)
CREATE TABLE IF NOT EXISTS brain_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_type ENUM('team', 'status', 'priority', 'progress', 'category') NOT NULL,
  config_value VARCHAR(100) NOT NULL,
  category_tag VARCHAR(50) DEFAULT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_config (config_type, config_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: brain_defaults
CREATE TABLE IF NOT EXISTS brain_defaults (
  id INT AUTO_INCREMENT PRIMARY KEY,
  default_key VARCHAR(50) NOT NULL UNIQUE,
  default_value VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL UNIQUE,
  project_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  owner VARCHAR(100),
  status ENUM('Planning', 'Active', 'On Hold', 'Closed') DEFAULT 'Planning',
  notes TEXT,
  progress DECIMAL(5,2) DEFAULT 0.00,
  start_date DATETIME NULL,
  closed_date DATETIME NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(20) NOT NULL UNIQUE,
  task_name VARCHAR(255) NOT NULL,
  project_id VARCHAR(20) NOT NULL,
  assignee VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Backlog',
  priority VARCHAR(10) DEFAULT 'P1',
  progress VARCHAR(10) DEFAULT '0%',
  due_date DATE NULL,
  start_date DATETIME NULL,
  log_notes TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_assignee (assignee),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: weekly_snapshot (Audit Log)
CREATE TABLE IF NOT EXISTS weekly_snapshot (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  item_type ENUM('Project', 'Task') NOT NULL,
  item_id VARCHAR(20) NOT NULL,
  item_name VARCHAR(255),
  project_name VARCHAR(255),
  change_type VARCHAR(50),
  from_version INT,
  to_version INT,
  from_value TEXT,
  to_value TEXT,
  changed_by VARCHAR(100),
  notes TEXT,
  INDEX idx_item (item_type, item_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Brain Config
INSERT IGNORE INTO brain_config (config_type, config_value, category_tag, display_order, is_active) VALUES
('status', 'Backlog', NULL, 1, TRUE),
('status', 'To Do', NULL, 2, TRUE),
('status', 'In Progress', NULL, 3, TRUE),
('status', 'In Review', NULL, 4, TRUE),
('status', 'Done', NULL, 5, TRUE),
('status', 'Closed', NULL, 6, TRUE),
('priority', 'Low', NULL, 1, TRUE),
('priority', 'Normal', NULL, 2, TRUE),
('priority', 'High', NULL, 3, TRUE),
('priority', 'Urgent', NULL, 4, TRUE),
('priority', 'Recurring', NULL, 5, TRUE),
('progress', '0%', NULL, 1, TRUE),
('progress', '25%', NULL, 2, TRUE),
('progress', '50%', NULL, 3, TRUE),
('progress', '75%', NULL, 4, TRUE),
('progress', '100%', NULL, 5, TRUE),
('category', 'Development', 'Produk', 1, TRUE),
('category', 'Design', 'Produk', 2, TRUE),
('category', 'Marketing', 'Brand', 3, TRUE),
('category', 'Infrastructure', 'Perusahaan', 4, TRUE),
('category', 'Internal', 'Lainnya', 5, TRUE),
('category', 'Client Project', 'Produk', 6, TRUE),
('category', 'Personal Project', 'Lainnya', 7, TRUE);

-- Insert Default Values
INSERT IGNORE INTO brain_defaults (default_key, default_value) VALUES
('default_status', 'Backlog'),
('default_priority', 'Normal'),
('default_progress', '0%'),
('default_assignee', 'Workspace Owner'),
('default_category', 'Development');
`;

async function migrate() {
  let connection;
  
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Connect without database first
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL server');
    
    // Execute migration
    await connection.query(MIGRATION_SQL);
    console.log('✅ Database and tables created successfully');
    console.log(`✅ Database: ${DB_NAME}`);
    console.log('✅ Tables: brain_config, brain_defaults, projects, tasks, weekly_snapshot');
    console.log('✅ Default data inserted\n');
    
    // Verify tables
    await connection.query(`USE \`${DB_NAME}\``);
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 Tables in database:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

migrate();
