/**
 * Migration: Add due_date column to projects table
 * Run: node scripts/add-project-due-date.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raymaizing',
  });

  try {
    // Add due_date column to projects
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'due_date'
    `);

    if (cols.length === 0) {
      await connection.execute(`
        ALTER TABLE projects ADD COLUMN due_date DATE NULL AFTER start_date
      `);
      console.log('✅ Added due_date column to projects');
    } else {
      console.log('ℹ️  due_date column already exists');
    }

    // Backfill: set project due_date = max(task due_date) per project
    await connection.execute(`
      UPDATE projects p
      SET p.due_date = (
        SELECT MAX(t.due_date)
        FROM tasks t
        WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
      )
      WHERE p.due_date IS NULL
    `);
    console.log('✅ Backfilled project due_date from tasks');

    console.log('✅ Migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
