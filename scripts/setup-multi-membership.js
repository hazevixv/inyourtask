// Script untuk setup multi-membership system
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupMultiMembership() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n🔧 Setting up Multi-Membership System...\n');

    // 1. Check if org_unit_staff table exists
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'org_unit_staff'
    `);

    if (tables.length === 0) {
      console.log('Creating org_unit_staff table...');
      await connection.execute(`
        CREATE TABLE org_unit_staff (
          id INT AUTO_INCREMENT PRIMARY KEY,
          unit_id INT NOT NULL,
          username VARCHAR(50) NOT NULL,
          role VARCHAR(50) DEFAULT 'member',
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_by VARCHAR(50),
          UNIQUE KEY unique_assignment (unit_id, username),
          FOREIGN KEY (unit_id) REFERENCES organizational_units(id) ON DELETE CASCADE,
          FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
          INDEX idx_unit (unit_id),
          INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table created');
    } else {
      console.log('✅ Table org_unit_staff already exists');
    }

    // 2. Migrate existing assignments from users.org_unit_id to org_unit_staff
    console.log('\n📦 Migrating existing assignments...');
    
    const [existingAssignments] = await connection.execute(`
      SELECT username, org_unit_id 
      FROM users 
      WHERE org_unit_id IS NOT NULL AND is_active = 1
    `);

    let migrated = 0;
    let skipped = 0;

    for (const assignment of existingAssignments) {
      try {
        // Check if already exists
        const [existing] = await connection.execute(
          'SELECT id FROM org_unit_staff WHERE org_unit_id = ? AND username = ?',
          [assignment.org_unit_id, assignment.username]
        );

        if (existing.length === 0) {
          await connection.execute(
            'INSERT INTO org_unit_staff (org_unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
            [assignment.org_unit_id, assignment.username, 'staff', null]
          );
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.log(`  ⚠️  Error migrating ${assignment.username}: ${error.message}`);
      }
    }

    console.log(`  ✅ Migrated: ${migrated} assignments`);
    console.log(`  ⏭️  Skipped: ${skipped} (already exists)`);

    // 3. Create view for easy querying
    console.log('\n📊 Creating view v_org_unit_members...');
    
    await connection.execute('DROP VIEW IF EXISTS v_org_unit_members');
    await connection.execute(`
      CREATE VIEW v_org_unit_members AS
      SELECT 
        ous.id as assignment_id,
        ous.org_unit_id as unit_id,
        ou.unit_code,
        ou.unit_name,
        ou.unit_type,
        ous.username,
        u.full_name,
        u.email,
        u.job_position,
        u.avatar,
        ous.role as unit_role,
        ous.assigned_at,
        ous.assigned_by
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      JOIN users u ON ous.username = u.username
      WHERE ou.is_active = 1 AND u.is_active = 1
      ORDER BY ou.unit_name, u.full_name
    `);
    console.log('✅ View created');

    // 4. Show statistics
    console.log('\n📈 Statistics:\n');
    
    const [totalAssignments] = await connection.execute(
      'SELECT COUNT(*) as count FROM org_unit_staff'
    );
    console.log(`  Total assignments: ${totalAssignments[0].count}`);

    const [multiMembers] = await connection.execute(`
      SELECT ous.username, u.full_name, COUNT(*) as unit_count
      FROM org_unit_staff ous
      JOIN users u ON ous.username = u.username
      GROUP BY ous.username, u.full_name
      HAVING unit_count > 1
      ORDER BY unit_count DESC
    `);
    console.log(`  Multi-membership users: ${multiMembers.length}`);
    
    if (multiMembers.length > 0) {
      console.log('\n  Top multi-members:');
      multiMembers.slice(0, 5).forEach(m => {
        console.log(`    - ${m.full_name} (@${m.username}): ${m.unit_count} units`);
      });
    }

    const [unitsWithMembers] = await connection.execute(`
      SELECT COUNT(DISTINCT org_unit_id) as count FROM org_unit_staff
    `);
    console.log(`\n  Units with members: ${unitsWithMembers[0].count}`);

    console.log('\n✅ Multi-Membership System Setup Complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Use org_unit_staff table for all assignments');
    console.log('   2. Users can now be in multiple units');
    console.log('   3. Use v_org_unit_members view for queries');
    console.log('   4. Update UI to support multi-membership\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

setupMultiMembership();
