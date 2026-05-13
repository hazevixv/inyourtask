/**
 * Fix Users and Update Password
 * 1. Fix IMAN to be IMAN CANGGA (not IMAN HASANUDIN)
 * 2. Update all passwords to raytask123
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const NEW_PASSWORD = 'raytask123';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    // Hash new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log('✅ Password hashed\n');

    // Step 1: Fix IMAN user - should be IMAN CANGGA, not IMAN HASANUDIN
    console.log('📋 Step 1: Fixing IMAN user...');
    
    // Get correct IMAN CANGGA data
    const [imanCangga] = await connection.execute(
      'SELECT * FROM employees WHERE employee_id = ?',
      ['20033']
    );
    
    if (imanCangga[0]) {
      await connection.execute(`
        UPDATE users SET 
          employee_id = ?,
          full_name = ?,
          email = ?,
          job_position = ?,
          organization = ?,
          avatar = ?,
          is_active = 1
        WHERE username = ?
      `, [
        imanCangga[0].employee_id,
        imanCangga[0].name,
        imanCangga[0].email,
        imanCangga[0].job_position,
        imanCangga[0].organization,
        imanCangga[0].avatar_path,
        'iman'
      ]);
      console.log(`   ✅ Fixed: iman → ${imanCangga[0].name} (${imanCangga[0].email})`);
    }

    // Check if IMAN HASANUDIN exists as separate user
    const [imanHasanudin] = await connection.execute(
      'SELECT * FROM users WHERE full_name LIKE ?',
      ['%IMAN HASANUDIN%']
    );
    
    if (imanHasanudin.length > 0 && imanHasanudin[0].username !== 'iman') {
      console.log(`   ℹ️  IMAN HASANUDIN exists as separate user: ${imanHasanudin[0].username}`);
    }

    console.log('');

    // Step 2: Update ALL passwords to raytask123
    console.log('📋 Step 2: Updating all passwords to "raytask123"...');
    
    const [result] = await connection.execute(
      'UPDATE users SET password = ?',
      [hashedPassword]
    );
    
    console.log(`   ✅ Updated ${result.affectedRows} user passwords\n`);

    // Step 3: Verify team members
    console.log('📋 Step 3: Verifying team members...');
    console.log('─────────────────────────────────────────────────────────────');
    
    const [teamMembers] = await connection.execute(`
      SELECT 
        username, 
        full_name,
        CONCAT(
          SUBSTRING_INDEX(full_name, ' ', 1), ' ',
          SUBSTRING_INDEX(SUBSTRING_INDEX(full_name, ' ', 2), ' ', -1)
        ) as display_name,
        email, 
        job_position,
        organization
      FROM users 
      WHERE username IN ('wendra', 'iman', 'rizky', 'taufan', 'taufik')
      ORDER BY username
    `);
    
    teamMembers.forEach(member => {
      console.log(`✅ ${member.username.padEnd(10)} → ${member.display_name.padEnd(20)} (${member.email})`);
      console.log(`   ${member.job_position} - ${member.organization}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎉 SUCCESS! All fixed!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('🔐 Login Credentials:');
    console.log('   Email: Any employee email');
    console.log('   Password: raytask123 (for ALL users)\n');
    
    console.log('💡 Example Logins:');
    console.log('   Email: siwendra@gmail.com → R. WENDRA');
    console.log('   Email: hallo.imancangga@gmail.com → IMAN CANGGA');
    console.log('   Email: poetraarromadhon56@gmail.com → RIZKI PUTRA');
    console.log('   Email: hendarmulyadi16@gmail.com → HENDAR MULYADI/TAUFAN');
    console.log('   Email: taufiknrr.work@gmail.com → TAUFIK NUR');
    console.log('   Password: raytask123 (semua user)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

main();
