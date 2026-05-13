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

  console.log('\n🔧 Fixing Manufacturing Parent-Child Relationships...\n');

  // Correct mapping: [unit_id, correct_parent_id, correct_level]
  // Based on debug output:
  // id:45 = marketing & sales manager (Lv3, parent:5 ✅)
  // id:46 = divisi general affair (Lv3, parent:5 ✅)
  // id:47 = Factory General Manager (Lv3, parent:5 ✅)
  // id:48 = Divisi PJT - QA Manager (Lv3, parent:5 ✅)
  // id:49 = Product Development Manager (Lv3, parent:5 ✅)
  // id:50 = Production Manager (Lv3, parent:5 ✅)

  const fixes = [
    // marketing & sales manager children (id:45)
    { id: 51, name: 'Staff Apoteker',           parent: 45, level: 4 },
    { id: 52, name: 'divisi marketing & sales', parent: 45, level: 4 },

    // divisi general affair children (id:46)
    { id: 53, name: 'GA - Technician',          parent: 46, level: 4 },
    { id: 54, name: 'GA - Support',             parent: 46, level: 4 },
    { id: 55, name: 'GA - Warehouse',           parent: 46, level: 4 },
    { id: 56, name: 'GA - Warehouse Manager',   parent: 46, level: 4 },

    // Factory General Manager children (id:47)
    { id: 57, name: 'divisi PPIC',              parent: 47, level: 4 },
    { id: 58, name: 'divisi Administration',    parent: 47, level: 4 },
    { id: 59, name: 'divisi Legal',             parent: 47, level: 4 },
    { id: 60, name: 'divisi Purchasing',        parent: 47, level: 4 },
    { id: 61, name: 'divisi Quality Control',   parent: 47, level: 4 },
    { id: 62, name: 'divisi Regulation',        parent: 47, level: 4 },
    { id: 63, name: 'divisi Warehouse',         parent: 47, level: 4 },

    // Divisi PJT - QA Manager children (id:48)
    { id: 64, name: 'Kepala Quality Control',   parent: 48, level: 4 },
    { id: 65, name: 'PJT',                      parent: 48, level: 4 },

    // Product Development Manager children (id:49)
    { id: 66, name: 'divisi Research and Development', parent: 49, level: 4 },

    // Production Manager children (id:50)
    { id: 67, name: 'divisi Production',        parent: 50, level: 4 },
  ];

  for (const fix of fixes) {
    await c.execute(
      'UPDATE organizational_units SET parent_id = ?, level = ? WHERE id = ?',
      [fix.parent, fix.level, fix.id]
    );
    console.log(`  ✅ [${fix.id}] "${fix.name}" → parent: ${fix.parent} (Lv${fix.level})`);
  }

  console.log(`\n✅ Fixed ${fixes.length} units!\n`);

  // Verify
  console.log('🔍 Verification:\n');
  const [check] = await c.execute(`
    SELECT ou.id, ou.unit_name, ou.level, p.unit_name as parent_name
    FROM organizational_units ou
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    WHERE ou.parent_id IN (45,46,47,48,49,50)
    ORDER BY ou.parent_id, ou.unit_name
  `);

  let lastParent = '';
  check.forEach(u => {
    if (u.parent_name !== lastParent) {
      console.log(`\n  📁 ${u.parent_name}:`);
      lastParent = u.parent_name;
    }
    console.log(`    └─ ${u.unit_name} (Lv${u.level})`);
  });

  console.log('\n✅ Done!\n');
  await c.end();
})();
