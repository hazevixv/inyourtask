/**
 * Test script to verify tracking/logging functionality
 * This will create some sample log entries to test the tracking page
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testTracking() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raymaizing_task'
  });

  console.log('✓ Connected to database');

  try {
    // Check if weekly_snapshot table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'weekly_snapshot'"
    );

    if (tables.length === 0) {
      console.log('✗ Table weekly_snapshot does not exist!');
      console.log('Creating weekly_snapshot table...');
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS weekly_snapshot (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          item_type ENUM('Project', 'Task') NOT NULL,
          item_id VARCHAR(50) NOT NULL,
          item_name VARCHAR(255),
          project_name VARCHAR(255),
          change_type VARCHAR(100),
          from_version INT,
          to_version INT,
          from_value TEXT,
          to_value TEXT,
          changed_by VARCHAR(100),
          notes TEXT,
          INDEX idx_item (item_type, item_id),
          INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✓ Table weekly_snapshot created');
    } else {
      console.log('✓ Table weekly_snapshot exists');
    }

    // Count existing logs
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM weekly_snapshot'
    );
    const existingCount = countResult[0].count;
    console.log(`✓ Found ${existingCount} existing log entries`);

    // Get sample tasks and projects
    const [tasks] = await connection.query('SELECT * FROM tasks LIMIT 3');
    const [projects] = await connection.query('SELECT * FROM projects LIMIT 3');

    console.log(`✓ Found ${tasks.length} tasks and ${projects.length} projects`);

    if (tasks.length === 0 && projects.length === 0) {
      console.log('⚠ No tasks or projects found. Please create some first.');
      await connection.end();
      return;
    }

    // Create sample log entries for tasks
    for (const task of tasks) {
      // Simulate a status change
      await connection.query(`
        INSERT INTO weekly_snapshot 
        (item_type, item_id, item_name, project_name, change_type, from_version, to_version, from_value, to_value, changed_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Task',
        task.task_id,
        task.task_name,
        task.project_id,
        'Status',
        task.version - 1,
        task.version,
        'Backlog',
        task.status,
        'taufik',
        'Status updated via test script'
      ]);
      console.log(`✓ Created log entry for task ${task.task_id}`);
    }

    // Create sample log entries for projects
    for (const project of projects) {
      // Simulate a status change
      await connection.query(`
        INSERT INTO weekly_snapshot 
        (item_type, item_id, item_name, project_name, change_type, from_version, to_version, from_value, to_value, changed_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Project',
        project.project_id,
        project.project_name,
        null,
        'Status',
        project.version - 1,
        project.version,
        'Planning',
        project.status,
        'taufik',
        'Status updated via test script'
      ]);
      console.log(`✓ Created log entry for project ${project.project_id}`);
    }

    // Count logs again
    const [newCountResult] = await connection.query(
      'SELECT COUNT(*) as count FROM weekly_snapshot'
    );
    const newCount = newCountResult[0].count;
    console.log(`✓ Total log entries now: ${newCount} (added ${newCount - existingCount})`);

    console.log('\n✅ Tracking test completed successfully!');
    console.log('Visit http://localhost:3002/tracking to see the logs');

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await connection.end();
    console.log('✓ Database connection closed');
  }
}

testTracking().catch(console.error);
