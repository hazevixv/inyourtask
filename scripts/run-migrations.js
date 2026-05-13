const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
  const dbName = process.env.DB_NAME || 'ray-task_management';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    console.log('Connected to database');

    // 1. Add category_tag column to brain_config (check first)
    console.log('\n--- Adding category_tag column to brain_config ---');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'brain_config' AND COLUMN_NAME = 'category_tag'
    `, [dbName]);
    if (cols.length === 0) {
      await connection.execute(`ALTER TABLE brain_config ADD COLUMN category_tag VARCHAR(50) DEFAULT NULL AFTER config_value`);
      console.log('Added category_tag column');
    } else {
      console.log('Column category_tag already exists');
    }

    await connection.execute(`UPDATE brain_config SET category_tag = 'Lainnya' WHERE config_type = 'category' AND (category_tag IS NULL OR category_tag = '')`);
    console.log('Updated category_tag for existing categories');

    // 2. Create user_roles table
    console.log('\n--- Creating user_roles table ---');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        assigned_by VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
        UNIQUE KEY unique_user_role (username, role_name),
        INDEX idx_username (username),
        INDEX idx_role_name (role_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(err => console.log('user_roles:', err.message));
    console.log('user_roles table ready');

    // 3. Create agent_role_assignments table
    console.log('\n--- Creating agent_role_assignments table ---');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS agent_role_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        assigned_by VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE,
        UNIQUE KEY unique_agent_role (agent_id, role_name),
        INDEX idx_agent_id (agent_id),
        INDEX idx_role_name (role_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(err => console.log('agent_role_assignments:', err.message));
    console.log('agent_role_assignments table ready');

    // 4. Create v_org_hierarchy view
    console.log('\n--- Creating v_org_hierarchy view ---');
    await connection.execute(`DROP VIEW IF EXISTS v_org_hierarchy`).catch(() => {});
    await connection.execute(`
      CREATE VIEW v_org_hierarchy AS
      SELECT 
        ou.*,
        owner.full_name as owner_name,
        owner.avatar as owner_avatar,
        dir.full_name as direksi_name,
        dir.avatar as direksi_avatar,
        mgr.full_name as manager_name,
        mgr.avatar as manager_avatar,
        COUNT(DISTINCT ous.username) as assigned_staff,
        COUNT(DISTINCT u.username) as member_count,
        COUNT(DISTINCT p.project_id) as project_count,
        COUNT(DISTINCT t.task_id) as task_count
      FROM organizational_units ou
      LEFT JOIN users owner ON owner.username = ou.owner_username
      LEFT JOIN users dir ON dir.username = ou.direksi_username
      LEFT JOIN users mgr ON mgr.username = ou.manager_username
      LEFT JOIN org_unit_staff ous ON ou.id = ous.org_unit_id
      LEFT JOIN users u ON u.org_unit_id = ou.id AND u.is_active = 1
      LEFT JOIN projects p ON p.org_unit_id = ou.id
      LEFT JOIN tasks t ON t.org_unit_id = ou.id
      GROUP BY ou.id
    `).catch(err => console.log('v_org_hierarchy:', err.message));
    console.log('v_org_hierarchy view ready');

    // 5. Seed brain_defaults if empty
    console.log('\n--- Seeding brain_defaults ---');
    const [defaults] = await connection.execute('SELECT COUNT(*) as cnt FROM brain_defaults');
    if (defaults[0].cnt === 0) {
      await connection.execute(`
        INSERT INTO brain_defaults (default_key, default_value) VALUES
        ('default_status', 'Backlog'),
        ('default_priority', 'Normal'),
        ('default_progress', '0%'),
        ('default_category', 'Development'),
        ('default_assignee', 'Workspace Owner')
      `);
      console.log('brain_defaults seeded');
    } else {
      console.log('brain_defaults already has data');
    }

    // 6. Update existing projects/tasks with visibility
    console.log('\n--- Updating existing projects/tasks visibility ---');
    await connection.execute(`UPDATE projects SET visibility = 'public', created_by = COALESCE(created_by, owner, 'admin') WHERE visibility IS NULL OR visibility = ''`);
    await connection.execute(`UPDATE tasks SET visibility = 'public', created_by = COALESCE(created_by, 'admin') WHERE visibility IS NULL OR visibility = ''`);
    console.log('Updated visibility for existing projects/tasks');

    console.log('\n=== All migrations completed successfully! ===');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigrations();
