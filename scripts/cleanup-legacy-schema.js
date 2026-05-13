const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'ray-task_management'
  });

  console.log('Connected to database.');

  try {
    // 1. Clean organizational data
    console.log('\n1. Cleaning organizational data...');
    await conn.execute('DELETE FROM org_unit_staff');
    console.log('   - Cleared org_unit_staff');
    await conn.execute('DELETE FROM organizational_units');
    console.log('   - Cleared organizational_units');
    await conn.execute('DELETE FROM team_members');
    console.log('   - Cleared team_members');

    // 2. Drop legacy columns from users
    console.log('\n2. Dropping legacy columns from users...');
    const legacyUserColumns = [
      'employee_id', 'job_position', 'organization',
      'hierarchy_level', 'direktur_level', 'division',
      'manager_username', 'direksi_username', 'org_unit_id'
    ];

    for (const col of legacyUserColumns) {
      try {
        const [existing] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'ray-task_management' AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
          [col]
        );
        if (existing[0].cnt > 0) {
          // Drop FK first if it exists
          try {
            const [fk] = await conn.execute(
              `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'ray-task_management' AND TABLE_NAME = 'users' AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
              [col]
            );
            if (fk.length > 0) {
              await conn.execute(`ALTER TABLE users DROP FOREIGN KEY ${fk[0].CONSTRAINT_NAME}`);
              console.log(`   - Dropped FK on users.${col}`);
            }
          } catch (e) {}
          await conn.execute(`ALTER TABLE users DROP COLUMN \`${col}\``);
          console.log(`   - Dropped users.${col}`);
        } else {
          console.log(`   - users.${col} already gone`);
        }
      } catch (e) {
        console.log(`   - Could not drop users.${col}: ${e.message}`);
      }
    }

    // 3. Drop legacy columns from projects
    console.log('\n3. Dropping legacy columns from projects...');
    for (const col of ['division', 'org_unit_id']) {
      try {
        const [existing] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'ray-task_management' AND TABLE_NAME = 'projects' AND COLUMN_NAME = ?`,
          [col]
        );
        if (existing[0].cnt > 0) {
          await conn.execute(`ALTER TABLE projects DROP COLUMN \`${col}\``);
          console.log(`   - Dropped projects.${col}`);
        }
      } catch (e) {
        console.log(`   - Could not drop projects.${col}: ${e.message}`);
      }
    }

    // 4. Drop legacy columns from tasks
    console.log('\n4. Dropping legacy columns from tasks...');
    for (const col of ['division', 'org_unit_id']) {
      try {
        const [existing] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'ray-task_management' AND TABLE_NAME = 'tasks' AND COLUMN_NAME = ?`,
          [col]
        );
        if (existing[0].cnt > 0) {
          await conn.execute(`ALTER TABLE tasks DROP COLUMN \`${col}\``);
          console.log(`   - Dropped tasks.${col}`);
        }
      } catch (e) {
        console.log(`   - Could not drop tasks.${col}: ${e.message}`);
      }
    }

    // 5. Drop visibility column from projects/tasks (optional, if not needed for personal use)
    console.log('\n5. Checking visibility column...');

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  await conn.end();
}

main();
