// Script untuk auto-assign members berdasarkan job position
const mysql = require('mysql2/promise');
require('dotenv').config();

async function autoAssignMembers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n🔧 Auto-assigning Members based on Job Position...\n');

    // Get all active users
    const [users] = await connection.execute(`
      SELECT username, full_name, job_position 
      FROM users 
      WHERE is_active = 1 AND job_position IS NOT NULL
      ORDER BY job_position
    `);

    console.log(`📊 Found ${users.length} active users with job positions\n`);

    // Mapping job position to unit name (case-insensitive partial match)
    const jobToUnit = {
      'Administration': 'divisi Administration',
      'Beautylatory': 'divisi Beautylatory',
      'Business Development': 'divisi business development',
      'Creative': 'divisi creative',
      'Finance': 'divisi finance',
      'IT Support': 'divisi IT Support',
      'Media': 'divisi media',
      'Marketing': 'divisi marketing',
      'Research & Development': 'divisi research & development',
      'Designer': 'divisi Designer',
      'Marketing & Sales': 'divisi marketing & sales',
      'Production': 'divisi Production',
      'Purchasing': 'divisi Purchasing',
      'Quality Control': 'divisi Quality Control',
      'Regulation': 'divisi Regulation',
      'Research and Development': 'divisi Research and Development',
      'Warehouse': 'divisi Warehouse',
      'PPIC': 'divisi PPIC',
      'Legal': 'divisi Legal',
      'General Manager': 'Factory General Manager',
      'GA': 'divisi general affair',
      'Apoteker': 'Staff Apoteker',
      'PJT': 'PJT',
    };

    let assigned = 0;
    let notFound = 0;

    for (const user of users) {
      try {
        // Find matching unit based on job position
        let unitName = null;
        
        for (const [keyword, unit] of Object.entries(jobToUnit)) {
          if (user.job_position.includes(keyword)) {
            unitName = unit;
            break;
          }
        }

        if (!unitName) {
          console.log(`  ⚠️  No match: ${user.full_name} (${user.job_position})`);
          notFound++;
          continue;
        }

        // Find unit ID
        const [units] = await connection.execute(
          'SELECT id FROM organizational_units WHERE unit_name = ?',
          [unitName]
        );

        if (units.length === 0) {
          console.log(`  ⚠️  Unit not found: ${unitName} for ${user.full_name}`);
          notFound++;
          continue;
        }

        // Assign user to unit
        await connection.execute(
          'INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
          [units[0].id, user.username, 'staff', null]
        );

        console.log(`  ✅ Assigned: ${user.full_name} → ${unitName}`);
        assigned++;

      } catch (error) {
        console.log(`  ❌ Error assigning ${user.full_name}: ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Assigned: ${assigned} members`);
    console.log(`  ⚠️  Not found: ${notFound} members\n`);

    // Show statistics
    const [stats] = await connection.execute(`
      SELECT 
        ou.unit_name,
        COUNT(ous.username) as member_count
      FROM organizational_units ou
      LEFT JOIN org_unit_staff ous ON ou.id = ous.org_unit_id
      WHERE ou.unit_type = 'division'
      GROUP BY ou.id, ou.unit_name
      HAVING member_count > 0
      ORDER BY member_count DESC
    `);

    console.log('📊 Units with Members:\n');
    stats.forEach(s => {
      console.log(`  ${s.unit_name}: ${s.member_count} members`);
    });

    console.log('\n✅ Auto-assignment Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

autoAssignMembers();
