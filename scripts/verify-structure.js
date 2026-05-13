// Script untuk verifikasi struktur organisasi final
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     ORGANIZATIONAL STRUCTURE VERIFICATION REPORT          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Count units by level
    const [levelCounts] = await connection.execute(`
      SELECT level, COUNT(*) as count
      FROM organizational_units
      WHERE is_active = 1
      GROUP BY level
      ORDER BY level
    `);

    console.log('📊 Units by Level:');
    levelCounts.forEach(l => {
      console.log(`   Level ${l.level}: ${l.count} units`);
    });
    console.log('');

    // 2. Count members by unit
    const [memberCounts] = await connection.execute(`
      SELECT 
        ou.unit_name,
        ou.unit_type,
        COUNT(u.username) as member_count
      FROM organizational_units ou
      LEFT JOIN users u ON u.org_unit_id = ou.id AND u.is_active = 1
      WHERE ou.is_active = 1
      GROUP BY ou.id, ou.unit_name, ou.unit_type
      HAVING member_count > 0
      ORDER BY member_count DESC
    `);

    console.log('👥 Top 10 Units by Member Count:');
    memberCounts.slice(0, 10).forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.unit_name} (${u.unit_type}): ${u.member_count} members`);
    });
    console.log('');

    // 3. Check for orphaned units
    const [orphans] = await connection.execute(`
      SELECT unit_code, unit_name, level
      FROM organizational_units
      WHERE is_active = 1
        AND level > 0
        AND parent_id NOT IN (SELECT id FROM organizational_units WHERE is_active = 1)
    `);

    if (orphans.length > 0) {
      console.log('⚠️  Orphaned Units (need parent fix):');
      orphans.forEach(o => {
        console.log(`   - ${o.unit_name} (${o.unit_code}) at level ${o.level}`);
      });
      console.log('');
    } else {
      console.log('✅ No orphaned units found\n');
    }

    // 4. Check for empty units
    const [emptyUnits] = await connection.execute(`
      SELECT 
        ou.unit_code, 
        ou.unit_name, 
        ou.level,
        (SELECT COUNT(*) FROM organizational_units WHERE parent_id = ou.id) as child_count
      FROM organizational_units ou
      WHERE ou.is_active = 1
        AND ou.id NOT IN (SELECT DISTINCT org_unit_id FROM users WHERE org_unit_id IS NOT NULL AND is_active = 1)
      ORDER BY ou.level DESC, ou.unit_name
    `);

    const emptyLeafs = emptyUnits.filter(u => u.child_count === 0);
    if (emptyLeafs.length > 0) {
      console.log('📭 Empty Leaf Units (no members, no children):');
      emptyLeafs.forEach(u => {
        console.log(`   - ${u.unit_name} (Level ${u.level})`);
      });
      console.log('');
    } else {
      console.log('✅ No empty leaf units\n');
    }

    // 5. Show complete hierarchy tree
    console.log('🌳 Complete Hierarchy Tree:\n');
    
    const [allUnits] = await connection.execute(`
      SELECT 
        ou.id,
        ou.unit_code,
        ou.unit_name,
        ou.unit_type,
        ou.level,
        ou.parent_id,
        ou.color,
        COUNT(u.username) as member_count
      FROM organizational_units ou
      LEFT JOIN users u ON u.org_unit_id = ou.id AND u.is_active = 1
      WHERE ou.is_active = 1
      GROUP BY ou.id
      ORDER BY ou.level, ou.sort_order, ou.unit_name
    `);

    function buildTree(units, parentId = null, indent = '') {
      const children = units.filter(u => u.parent_id === parentId);
      children.forEach((unit, index) => {
        const isLast = index === children.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        const childIndent = indent + (isLast ? '    ' : '│   ');
        
        const typeEmoji = {
          company: '🏢',
          division: '📁',
          department: '📂',
          team: '👥',
          product: '📦',
          unit: '⚙️'
        }[unit.unit_type] || '📌';
        
        console.log(`${indent}${prefix}${typeEmoji} ${unit.unit_name} (${unit.member_count} members)`);
        buildTree(units, unit.id, childIndent);
      });
    }

    buildTree(allUnits);

    // 6. Summary statistics
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SUMMARY STATISTICS                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const [stats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM organizational_units WHERE is_active = 1) as total_units,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_employees,
        (SELECT COUNT(*) FROM users WHERE org_unit_id IS NOT NULL AND is_active = 1) as assigned_employees,
        (SELECT COUNT(*) FROM users WHERE org_unit_id IS NULL AND is_active = 1) as unassigned_employees,
        (SELECT COUNT(DISTINCT job_position) FROM users WHERE job_position IS NOT NULL AND job_position != '' AND is_active = 1) as unique_job_positions
    `);

    const s = stats[0];
    console.log(`   Total Units: ${s.total_units}`);
    console.log(`   Total Employees: ${s.total_employees}`);
    console.log(`   Assigned to Units: ${s.assigned_employees} (${Math.round(s.assigned_employees/s.total_employees*100)}%)`);
    console.log(`   Unassigned: ${s.unassigned_employees} (${Math.round(s.unassigned_employees/s.total_employees*100)}%)`);
    console.log(`   Unique Job Positions: ${s.unique_job_positions}`);
    console.log('');

    // 7. Health check
    console.log('🏥 Health Check:');
    const issues = [];
    
    if (orphans.length > 0) issues.push(`${orphans.length} orphaned units`);
    if (emptyLeafs.length > 0) issues.push(`${emptyLeafs.length} empty leaf units`);
    if (s.unassigned_employees > 0) issues.push(`${s.unassigned_employees} unassigned employees`);
    
    if (issues.length === 0) {
      console.log('   ✅ All checks passed! Structure is healthy.\n');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach(issue => console.log(`      - ${issue}`));
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyStructure();
