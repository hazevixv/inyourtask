const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateProjectAssignees() {
  let connection;
  
  try {
    console.log('🔄 Migrating project owner to assignees...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Check if assignees column exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM projects LIKE 'assignees'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Column "assignees" already exists');
    } else {
      console.log('📝 Adding "assignees" column...');
      
      // Add assignees column (TEXT to store comma-separated values)
      await connection.query(`
        ALTER TABLE projects 
        ADD COLUMN assignees TEXT NULL AFTER owner
      `);
      
      console.log('✅ Column "assignees" added');
    }
    
    // Migrate existing owner data to assignees
    console.log('\n📋 Migrating existing owner data...');
    const [projects] = await connection.query(`
      SELECT project_id, owner 
      FROM projects 
      WHERE owner IS NOT NULL AND owner != ''
    `);
    
    if (projects.length > 0) {
      for (const project of projects) {
        await connection.query(`
          UPDATE projects 
          SET assignees = ? 
          WHERE project_id = ?
        `, [project.owner, project.project_id]);
        
        console.log(`   ✅ ${project.project_id}: ${project.owner} → assignees`);
      }
      console.log(`\n✅ Migrated ${projects.length} projects`);
    } else {
      console.log('   ℹ️  No projects with owner to migrate');
    }
    
    // Show final result
    const [final] = await connection.query(`
      SELECT project_id, project_name, owner, assignees 
      FROM projects 
      ORDER BY project_id
    `);
    
    console.log('\n📊 Final project assignees:');
    final.forEach(p => {
      console.log(`   ${p.project_id}: ${p.project_name}`);
      console.log(`      Owner: ${p.owner || 'null'}`);
      console.log(`      Assignees: ${p.assignees || 'null'}`);
    });
    
    console.log('\n🎉 Migration completed!');
    console.log('\nℹ️  Note: "owner" column kept for backward compatibility');
    console.log('   You can remove it later if needed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

migrateProjectAssignees();
