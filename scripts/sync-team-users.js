const mysql = require('mysql2/promise');
require('dotenv').config();

async function syncTeamUsers() {
  let connection;
  
  try {
    console.log('🔄 Syncing team members with users...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray-task_management',
    });
    
    // Get team members from brain_config
    const [teamResult] = await connection.query(`
      SELECT config_value 
      FROM brain_config 
      WHERE config_type = 'team' AND is_active = TRUE
    `);
    
    if (teamResult.length === 0) {
      console.log('❌ Team members not found in brain_config');
      return;
    }
    
    const teamMembers = teamResult.map(r => r.config_value);
    console.log('📋 Team members:', teamMembers);
    
    // Check existing users
    const [existingUsers] = await connection.query('SELECT username FROM users');
    const existingUsernames = existingUsers.map(u => u.username);
    
    console.log('👥 Existing users:', existingUsernames);
    
    // Add missing team members as users
    let added = 0;
    for (const member of teamMembers) {
      // Skip special values
      if (member === 'all tim' || member === 'unassign') continue;
      
      if (!existingUsernames.includes(member)) {
        await connection.query(`
          INSERT INTO users (username, password, full_name, email, role) 
          VALUES (?, ?, ?, ?, 'user')
        `, [
          member,
          `${member}123`, // Default password
          member.charAt(0).toUpperCase() + member.slice(1), // Capitalize first letter
          `${member}@rayacademy.com`
        ]);
        console.log(`✅ Added user: ${member} (password: ${member}123)`);
        added++;
      }
    }
    
    if (added === 0) {
      console.log('✅ All team members already exist as users');
    } else {
      console.log(`\n✅ Added ${added} new users`);
    }
    
    // Show all users
    const [allUsers] = await connection.query('SELECT username, full_name, role FROM users ORDER BY username');
    console.log('\n👥 All users now:');
    allUsers.forEach(u => {
      console.log(`   - ${u.username} (${u.full_name}) - ${u.role}`);
    });
    
    console.log('\n🎉 Sync completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

syncTeamUsers();
