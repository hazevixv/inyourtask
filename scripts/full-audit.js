const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management'
  });

  console.log('\n========== FULL AUDIT ==========\n');

  // 1. Full tree
  const [units] = await c.execute(`
    SELECT ou.id, ou.unit_name, ou.unit_type, ou.unit_code, ou.level, ou.parent_id,
           p.unit_name as parent_name,
           COUNT(DISTINCT ous.username) as member_count
    FROM organizational_units ou
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    LEFT JOIN org_unit_staff ous ON ous.org_unit_id = ou.id
    WHERE ou.is_active = 1
    GROUP BY ou.id
    ORDER BY ou.level, ou.parent_id, ou.unit_name
  `);

  console.log('=== UNIT TREE ===\n');
  function printTree(parentId, indent = '') {
    const children = units.filter(u => u.parent_id === parentId);
    children.forEach((u, i) => {
      const last = i === children.length - 1;
      const pre = last ? '└─' : '├─';
      const mem = u.member_count > 0 ? ` [${u.member_count} members]` : '';
      console.log(`${indent}${pre} [${u.id}] ${u.unit_name} (${u.unit_type})${mem}`);
      printTree(u.id, indent + (last ? '   ' : '│  '));
    });
  }
  const root = units.find(u => u.parent_id === null);
  if (root) {
    console.log(`[${root.id}] ${root.unit_name} (${root.unit_type}) [${root.member_count} members]`);
    printTree(root.id);
  }

  // 2. All assignments
  console.log('\n\n=== ALL MEMBER ASSIGNMENTS ===\n');
  const [assignments] = await c.execute(`
    SELECT u.username, u.full_name, u.job_position,
           ou.id as unit_id, ou.unit_name,
           p.unit_name as parent_name
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    WHERE u.is_active = 1
    ORDER BY ou.unit_name, u.full_name
  `);
  assignments.forEach(a => {
    console.log(`  [${a.unit_id}] ${a.unit_name} ← ${a.full_name} (${a.job_position})`);
  });

  // 3. Users with NO assignment
  console.log('\n\n=== USERS WITH NO UNIT ASSIGNMENT ===\n');
  const [unassigned] = await c.execute(`
    SELECT u.username, u.full_name, u.job_position
    FROM users u
    WHERE u.is_active = 1
    AND u.username NOT IN (SELECT DISTINCT username FROM org_unit_staff)
    ORDER BY u.full_name
  `);
  if (unassigned.length === 0) {
    console.log('  ✅ All users are assigned!');
  } else {
    unassigned.forEach(u => console.log(`  ⚠️  ${u.full_name} (${u.job_position})`));
  }

  // 4. Duplicate assignments (same person in multiple units)
  console.log('\n\n=== MULTI-UNIT MEMBERS ===\n');
  const [multi] = await c.execute(`
    SELECT u.full_name, u.job_position, COUNT(*) as unit_count,
           GROUP_CONCAT(ou.unit_name ORDER BY ou.unit_name SEPARATOR ' | ') as units
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    GROUP BY ous.username
    HAVING unit_count > 1
    ORDER BY unit_count DESC
  `);
  if (multi.length === 0) {
    console.log('  (none)');
  } else {
    multi.forEach(m => console.log(`  ${m.full_name}: ${m.units}`));
  }

  // 5. Empty leaf units (no children, no members)
  console.log('\n\n=== EMPTY LEAF UNITS ===\n');
  const [empty] = await c.execute(`
    SELECT ou.id, ou.unit_name, ou.unit_type, p.unit_name as parent_name
    FROM organizational_units ou
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    WHERE ou.is_active = 1
    AND ou.id NOT IN (SELECT DISTINCT parent_id FROM organizational_units WHERE parent_id IS NOT NULL)
    AND ou.id NOT IN (SELECT DISTINCT org_unit_id FROM org_unit_staff)
    ORDER BY ou.unit_name
  `);
  empty.forEach(u => console.log(`  [${u.id}] ${u.unit_name} (under: ${u.parent_name})`));
  if (empty.length === 0) console.log('  ✅ No empty leaf units!');

  console.log('\n================================\n');
  await c.end();
})();
