const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
};

async function seed() {
  let connection;
  
  try {
    console.log('🌱 Seeding sample data...\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL');
    
    // Insert sample projects
    await connection.query(`
      INSERT INTO projects (project_id, project_name, category, owner, status, notes, progress, start_date) VALUES
      ('PRJ-001', 'Website Redesign', 'Development', 'taufik', 'Active', 'Redesign company website with modern UI', 45, NOW()),
      ('PRJ-002', 'Mobile App Launch', 'Development', 'iman', 'Active', 'Launch new mobile application', 30, NOW()),
      ('PRJ-003', 'Marketing Campaign', 'Marketing', 'admin', 'Planning', 'Q2 marketing campaign planning', 10, NULL)
    `);
    console.log('✅ Inserted 3 sample projects');
    
    // Insert sample tasks
    await connection.query(`
      INSERT INTO tasks (task_id, task_name, project_id, assignee, status, priority, progress, due_date, start_date) VALUES
      ('TSK-001', 'Design Homepage Mockup', 'PRJ-001', 'taufik', 'In Progress', 'P0', '50%', DATE_ADD(NOW(), INTERVAL 3 DAY), NOW()),
      ('TSK-002', 'Setup Development Environment', 'PRJ-001', 'taufik', 'Done', 'P1', '100%', NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('TSK-003', 'API Integration', 'PRJ-002', 'iman', 'Minggu Ini', 'P0', '25%', DATE_ADD(NOW(), INTERVAL 5 DAY), NOW()),
      ('TSK-004', 'User Testing', 'PRJ-002', 'iman', 'Backlog', 'P2', '0%', DATE_ADD(NOW(), INTERVAL 10 DAY), NULL),
      ('TSK-005', 'Content Strategy', 'PRJ-003', 'admin', 'Backlog', 'P1', '0%', DATE_ADD(NOW(), INTERVAL 15 DAY), NULL)
    `);
    console.log('✅ Inserted 5 sample tasks');
    
    // Insert sample logs
    await connection.query(`
      INSERT INTO weekly_snapshot (item_type, item_id, item_name, project_name, change_type, from_version, to_version, from_value, to_value, changed_by, notes) VALUES
      ('Project', 'PRJ-001', 'Website Redesign', NULL, 'Status', 0, 1, 'Planning', 'Active', 'admin', 'Project started'),
      ('Task', 'TSK-001', 'Design Homepage Mockup', 'PRJ-001', 'Status', 0, 1, 'Backlog', 'In Progress', 'taufik', 'Started working'),
      ('Task', 'TSK-002', 'Setup Development Environment', 'PRJ-001', 'Status', 1, 2, 'In Progress', 'Done', 'taufik', 'Completed')
    `);
    console.log('✅ Inserted 3 sample logs');
    
    console.log('\n🎉 Sample data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 3 Projects');
    console.log('   - 5 Tasks');
    console.log('   - 3 Activity Logs');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

seed();
