const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('Connected to database...');

    // Check if due_date column exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM projects LIKE 'due_date'"
    );

    if (columns.length === 0) {
      console.log('Adding due_date column to projects table...');
      await connection.query(
        'ALTER TABLE projects ADD COLUMN due_date DATE NULL AFTER progress'
      );
      console.log('✓ due_date column added');
    } else {
      console.log('✓ due_date column already exists');
    }

    // Update existing projects with due_date from tasks
    console.log('Syncing project due_dates from tasks...');
    await connection.query(`
      UPDATE projects p
      SET p.due_date = (
        SELECT MAX(t.due_date) 
        FROM tasks t 
        WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
      )
      WHERE p.due_date IS NULL
    `);
    console.log('✓ Project due_dates synced');

    // Update existing projects with start_date from tasks if not set
    console.log('Syncing project start_dates from tasks...');
    await connection.query(`
      UPDATE projects p
      SET p.start_date = (
        SELECT MIN(t.due_date) 
        FROM tasks t 
        WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
      )
      WHERE p.start_date IS NULL
    `);
    console.log('✓ Project start_dates synced');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
