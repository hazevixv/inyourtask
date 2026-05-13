// Script untuk membersihkan dan merestrukturisasi organizational units
const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupOrgStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n=== CLEANUP ORGANIZATIONAL STRUCTURE ===\n');
    
    // 1. Identifikasi unit yang duplikat atau tidak terpakai
    const [emptyUnits] = await connection.execute(`
      SELECT 
        id, unit_code, unit_name, level,
        (SELECT COUNT(*) FROM users WHERE org_unit_id = organizational_units.id AND is_active = 1) as member_count,
        (SELECT COUNT(*) FROM organizational_units ou2 WHERE ou2.parent_id = organizational_units.id) as child_count
      FROM organizational_units 
      WHERE is_active = 1
      ORDER BY level, unit_name
    `);

    console.log('Units without members and children (candidates for cleanup):');
    const emptyOnes = emptyUnits.filter(u => u.member_count === 0 && u.child_count === 0 && u.level > 0);
    emptyOnes.forEach(u => {
      console.log(`  - [${u.unit_code}] ${u.unit_name} (Level ${u.level})`);
    });
    console.log(`\nTotal empty units: ${emptyOnes.length}`);

    // 2. Cek job positions yang belum punya organizational unit
    const [jobPositions] = await connection.execute(`
      SELECT DISTINCT job_position 
      FROM users 
      WHERE job_position IS NOT NULL 
        AND job_position != '' 
        AND is_active = 1
      ORDER BY job_position
    `);

    const [existingUnits] = await connection.execute(`
      SELECT unit_code, unit_name 
      FROM organizational_units 
      WHERE is_active = 1
    `);

    const existingCodes = new Set(existingUnits.map(u => u.unit_code));
    
    console.log('\n\nJob positions without organizational unit:');
    const missingUnits = [];
    jobPositions.forEach(jp => {
      const code = jp.job_position.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      if (!existingCodes.has(code)) {
        console.log(`  - ${jp.job_position} → ${code}`);
        missingUnits.push({ name: jp.job_position, code });
      }
    });
    console.log(`\nTotal missing: ${missingUnits.length}`);

    // 3. Tampilkan struktur hierarki yang benar
    console.log('\n\n=== RECOMMENDED STRUCTURE ===\n');
    console.log('OWNER (Wendra Wilendra)');
    console.log('├── DIREKTUR_OFFICE (Primary Office Director)');
    console.log('│   ├── Administration');
    console.log('│   ├── Business Development');
    console.log('│   ├── Creative');
    console.log('│   ├── Finance');
    console.log('│   ├── Human Resources');
    console.log('│   ├── IT Support');
    console.log('│   ├── Media');
    console.log('│   └── Beautylatory (Brand)');
    console.log('│');
    console.log('└── DIREKTUR_MANUFACTURING (Manufacturing Director)');
    console.log('    ├── Production');
    console.log('    ├── Quality Control');
    console.log('    ├── Research and Development');
    console.log('    ├── Purchasing');
    console.log('    ├── Warehouse (GA)');
    console.log('    ├── Regulation');
    console.log('    ├── Myklon (Brand)');
    console.log('    └── PJT (Brand)');

    console.log('\n\n=== ACTIONS NEEDED ===\n');
    console.log('1. Delete empty units without members/children');
    console.log('2. Reorganize job position units under proper parent (Office/Manufacturing)');
    console.log('3. Merge duplicate units (e.g., Myklon, Myklon - Marketing, Myklon - RND)');
    console.log('4. Set proper hierarchy levels');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

cleanupOrgStructure();
