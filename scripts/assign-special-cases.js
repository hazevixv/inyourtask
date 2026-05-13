// Script untuk assign special cases yang tidak bisa auto-detect
const mysql = require('mysql2/promise');
require('dotenv').config();

async function assignSpecialCases() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n🔧 Assigning Special Cases...\n');

    // Manual mapping untuk special cases
    const specialAssignments = [
      // Beautylatory team
      { username: 'raden2', unitName: 'BEAUTYLATORY Store' },
      { username: 'iffah', unitName: 'BEAUTYLATORY Store' },
      { username: 'syafa', unitName: 'BEAUTYLATORY Store' },
      { username: 'raden', unitName: 'BEAUTYLATORY Store' },
      { username: 'citra', unitName: 'BEAUTYLATORY Store' },
      { username: 'dita', unitName: 'BEAUTYLATORY Store' },
      
      // Myklon team
      { username: 'muhammad2', unitName: 'MYKLON' },
      { username: 'pebriza', unitName: 'MYKLON' },
      { username: 'pito', unitName: 'MYKLON' },
      { username: 'muhamad', unitName: 'MYKLON' },
      
      // Management
      { username: 'wendra', unitName: 'Owner (Wendra Wilendra)' },
      { username: 'sri', unitName: 'Human Resources Manager' },
      { username: 'apt', unitName: 'Product Development Manager' },
    ];

    let assigned = 0;
    let failed = 0;

    for (const assignment of specialAssignments) {
      try {
        // Find unit ID
        const [units] = await connection.execute(
          'SELECT id, unit_name FROM organizational_units WHERE unit_name = ?',
          [assignment.unitName]
        );

        if (units.length === 0) {
          console.log(`  ⚠️  Unit not found: ${assignment.unitName}`);
          failed++;
          continue;
        }

        // Find user
        const [users] = await connection.execute(
          'SELECT username, full_name FROM users WHERE username = ?',
          [assignment.username]
        );

        if (users.length === 0) {
          console.log(`  ⚠️  User not found: ${assignment.username}`);
          failed++;
          continue;
        }

        // Assign
        await connection.execute(
          'INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
          [units[0].id, assignment.username, 'staff', null]
        );

        console.log(`  ✅ Assigned: ${users[0].full_name} → ${assignment.unitName}`);
        assigned++;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Assigned: ${assigned} special cases`);
    console.log(`  ⚠️  Failed: ${failed} cases\n`);

    // Final statistics
    const [totalStats] = await connection.execute(`
      SELECT COUNT(DISTINCT username) as total_members
      FROM org_unit_staff
    `);

    const [unitStats] = await connection.execute(`
      SELECT COUNT(DISTINCT org_unit_id) as units_with_members
      FROM org_unit_staff
    `);

    console.log('📊 Final Statistics:');
    console.log(`  Total members assigned: ${totalStats[0].total_members}`);
    console.log(`  Units with members: ${unitStats[0].units_with_members}\n`);

    console.log('✅ Special Cases Assignment Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

assignSpecialCases();
