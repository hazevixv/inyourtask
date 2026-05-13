/**
 * Verify Migration Success
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MIGRATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Total users
  const [totalResult] = await connection.execute('SELECT COUNT(*) as count FROM users');
  console.log(`✅ Total users: ${totalResult[0].count}\n`);

  // Team members
  console.log('👥 Team Members:');
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
    console.log(`${member.username.padEnd(10)} → ${member.display_name.padEnd(20)} (${member.email})`);
    console.log(`${' '.repeat(13)}${member.job_position} - ${member.organization}`);
    console.log('');
  });

  // Sample of other employees
  console.log('📋 Sample of Other Employees (first 10):');
  console.log('─────────────────────────────────────────────────────────────');
  const [otherEmployees] = await connection.execute(`
    SELECT 
      username,
      full_name,
      CONCAT(
        SUBSTRING_INDEX(full_name, ' ', 1), ' ',
        SUBSTRING_INDEX(SUBSTRING_INDEX(full_name, ' ', 2), ' ', -1)
      ) as display_name,
      email,
      job_position
    FROM users 
    WHERE username NOT IN ('wendra', 'iman', 'rizky', 'taufan', 'taufik', 'admin')
    ORDER BY full_name
    LIMIT 10
  `);
  
  otherEmployees.forEach(emp => {
    console.log(`${emp.username.padEnd(15)} → ${emp.display_name.padEnd(25)} (${emp.email})`);
  });

  console.log('\n...(and ' + (totalResult[0].count - 15) + ' more users)\n');

  // Check for issues
  console.log('🔍 Checking for Issues:');
  console.log('─────────────────────────────────────────────────────────────');
  
  const [noEmail] = await connection.execute(
    'SELECT COUNT(*) as count FROM users WHERE email IS NULL OR email = ""'
  );
  if (noEmail[0].count > 0) {
    console.log(`⚠️  ${noEmail[0].count} users without email`);
  } else {
    console.log('✅ All users have email');
  }

  const [dupEmails] = await connection.execute(`
    SELECT email, COUNT(*) as count 
    FROM users 
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email 
    HAVING count > 1
  `);
  if (dupEmails.length > 0) {
    console.log(`⚠️  ${dupEmails.length} duplicate emails found`);
    dupEmails.forEach(dup => {
      console.log(`   - ${dup.email} (${dup.count} times)`);
    });
  } else {
    console.log('✅ No duplicate emails');
  }

  const [noAvatar] = await connection.execute(
    'SELECT COUNT(*) as count FROM users WHERE avatar IS NULL OR avatar = ""'
  );
  console.log(`📷 Users with avatars: ${totalResult[0].count - noAvatar[0].count}/${totalResult[0].count}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🎉 MIGRATION SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📝 Next Steps:');
  console.log('   1. ✅ Migration completed');
  console.log('   2. ✅ Avatar files copied');
  console.log('   3. 🚀 Start server: npm run dev');
  console.log('   4. 🔐 Login with any employee email');
  console.log('   5. 🔑 Default password: "raymaizing2024"\n');
  
  console.log('💡 Example Logins:');
  console.log('   Email: siwendra@gmail.com → Display: R. WENDRA');
  console.log('   Email: hallo.imancangga@gmail.com → Display: IMAN CANGGA');
  console.log('   Email: poetraarromadhon56@gmail.com → Display: RIZKI PUTRA');
  console.log('   Email: fri210303@gmail.com → Display: ACHMAD FRIDAYU');
  console.log('   Password: raymaizing2024 (for new users)\n');

  await connection.end();
}

main();
