/**
 * Initialize brain_config and brain_defaults tables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initBrainTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raymaizing_task'
  });

  console.log('✓ Connected to database');

  try {
    // Check if brain_config table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'brain_config'"
    );

    if (tables.length === 0) {
      console.log('Creating brain_config table...');
      
      await connection.query(`
        CREATE TABLE brain_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_type ENUM('team', 'status', 'priority', 'progress', 'category') NOT NULL,
          config_value VARCHAR(100) NOT NULL,
          category_tag VARCHAR(50) DEFAULT NULL,
          display_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_config (config_type, config_value),
          INDEX idx_type (config_type),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✓ brain_config table created');

      // Insert default values
      console.log('Inserting default config values...');
      
      const defaultConfigs = [
        // Status
        ['status', 'Backlog', 1],
        ['status', 'To Do', 2],
        ['status', 'In Progress', 3],
        ['status', 'In Review', 4],
        ['status', 'Done', 5],
        ['status', 'Closed', 6],
        
        // Priority
        ['priority', 'Low', 1],
        ['priority', 'Normal', 2],
        ['priority', 'High', 3],
        ['priority', 'Urgent', 4],
        ['priority', 'Recurring', 5],
        
        // Progress
        ['progress', '0%', 1],
        ['progress', '25%', 2],
        ['progress', '50%', 3],
        ['progress', '75%', 4],
        ['progress', '100%', 5],
        
        // Category
        ['category', 'Development', 'Produk', 1],
        ['category', 'Design', 'Produk', 2],
        ['category', 'Marketing', 'Brand', 3],
        ['category', 'Infrastructure', 'Perusahaan', 4],
        ['category', 'Internal', 'Lainnya', 5],
        ['category', 'Client Project', 'Produk', 6],
        ['category', 'Personal Project', 'Lainnya', 7],
      ];

      for (const [type, value, tag, order] of defaultConfigs as any[]) {
        await connection.query(
          'INSERT IGNORE INTO brain_config (config_type, config_value, category_tag, display_order) VALUES (?, ?, ?, ?)',
          [type, value, type === 'category' ? tag : null, order]
        );
      }
      
      console.log('✓ Default config values inserted');
    } else {
      console.log('✓ brain_config table already exists');
    }

    // Check if brain_defaults table exists
    const [defaultsTables] = await connection.query(
      "SHOW TABLES LIKE 'brain_defaults'"
    );

    if (defaultsTables.length === 0) {
      console.log('Creating brain_defaults table...');
      
      await connection.query(`
        CREATE TABLE brain_defaults (
          id INT AUTO_INCREMENT PRIMARY KEY,
          default_key VARCHAR(50) NOT NULL UNIQUE,
          default_value VARCHAR(100) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_key (default_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✓ brain_defaults table created');

      // Insert default values
      console.log('Inserting default values...');
      
      const defaults = [
        ['default_category', 'Development'],
        ['default_status', 'Backlog'],
        ['default_priority', 'Normal'],
        ['default_progress', '0%'],
      ];

      for (const [key, value] of defaults) {
        await connection.query(
          'INSERT IGNORE INTO brain_defaults (default_key, default_value) VALUES (?, ?)',
          [key, value]
        );
      }
      
      console.log('✓ Default values inserted');
    } else {
      console.log('✓ brain_defaults table already exists');
    }

    // Verify data
    const [configCount] = await connection.query(
      'SELECT COUNT(*) as count FROM brain_config'
    );
    const [defaultsCount] = await connection.query(
      'SELECT COUNT(*) as count FROM brain_defaults'
    );

    console.log(`\n✅ Initialization complete!`);
    console.log(`   - brain_config: ${configCount[0].count} entries`);
    console.log(`   - brain_defaults: ${defaultsCount[0].count} entries`);

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await connection.end();
    console.log('✓ Database connection closed');
  }
}

initBrainTables().catch(console.error);
