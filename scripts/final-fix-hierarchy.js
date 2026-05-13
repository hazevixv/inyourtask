// Script untuk final fix hierarchy
const mysql = require('mysql2/promise');
require('dotenv').config();

async function finalFixHierarchy() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n=== FINAL HIERARCHY FIX ===\n');
    
    // 1. Get parent IDs
    const [parents] = await connection.execute(`
      SELECT id, unit_code FROM organizational_units 
      WHERE unit_code IN ('OWNER', 'DIREKTUR_OFFICE', 'DIREKTUR_MANUFACTURING')
    `);

    const owner = parents.find(p => p.unit_code === 'OWNER');
    const office = parents.find(p => p.unit_code === 'DIREKTUR_OFFICE');
    const mfg = parents.find(p => p.unit_code === 'DIREKTUR_MANUFACTURING');

    if (!owner || !office || !mfg) {
      console.log('❌ Parent units not found!');
      return;
    }

    // 2. Fix Myklon - merge into one unit under Manufacturing
    console.log('Step 1: Fixing Myklon units...');
    const [myklonUnits] = await connection.execute(`
      SELECT id, unit_code, unit_name 
      FROM organizational_units 
      WHERE unit_code LIKE 'MYKLON%' AND is_active = 1
    `);

    if (myklonUnits.length > 0) {
      // Create or get main Myklon unit
      let mainMyklon = myklonUnits.find(u => u.unit_code === 'MYKLON');
      
      if (!mainMyklon) {
        // Create main Myklon
        await connection.execute(`
          INSERT INTO organizational_units 
          (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon)
          VALUES ('MYKLON', 'Myklon', 'division', ?, 2, '/OWNER/DIREKTUR_MANUFACTURING/MYKLON', 100, '#f59e0b', 'package')
        `, [mfg.id]);
        
        const [newUnit] = await connection.execute(
          'SELECT id FROM organizational_units WHERE unit_code = "MYKLON" ORDER BY id DESC LIMIT 1'
        );
        mainMyklon = { id: newUnit[0].id, unit_code: 'MYKLON', unit_name: 'Myklon' };
        console.log('  ✓ Created main Myklon unit');
      } else {
        // Update main Myklon to be under Manufacturing
        await connection.execute(
          'UPDATE organizational_units SET parent_id = ?, level = 2, path = ? WHERE id = ?',
          [mfg.id, '/OWNER/DIREKTUR_MANUFACTURING/MYKLON', mainMyklon.id]
        );
        console.log('  ✓ Updated main Myklon unit');
      }

      // Move all members from other Myklon units to main
      for (const unit of myklonUnits) {
        if (unit.id !== mainMyklon.id) {
          await connection.execute(
            'UPDATE users SET org_unit_id = ? WHERE org_unit_id = ?',
            [mainMyklon.id, unit.id]
          );
          await connection.execute('DELETE FROM organizational_units WHERE id = ?', [unit.id]);
          console.log(`  ✓ Merged ${unit.unit_name} into main Myklon`);
        }
      }
    }

    // 3. Delete empty parent units (Office, Factory, Business, Brand)
    console.log('\nStep 2: Cleaning up empty parent units...');
    const emptyParents = ['OFFICE', 'FACTORY', 'BUSINESS', 'BRAND'];
    for (const code of emptyParents) {
      const [result] = await connection.execute(
        'DELETE FROM organizational_units WHERE unit_code = ? AND id NOT IN (SELECT DISTINCT org_unit_id FROM users WHERE org_unit_id IS NOT NULL)',
        [code]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ Deleted empty unit: ${code}`);
      }
    }

    // 4. Ensure all level 2 units have correct parent
    console.log('\nStep 3: Fixing orphaned units...');
    const [orphans] = await connection.execute(`
      SELECT id, unit_code, unit_name 
      FROM organizational_units 
      WHERE is_active = 1 
        AND level = 2 
        AND parent_id NOT IN (?, ?)
        AND parent_id IS NOT NULL
    `, [office.id, mfg.id]);

    for (const unit of orphans) {
      // Determine if office or manufacturing based on name
      const isOffice = ['ADMINISTRATION', 'BUSINESS', 'CREATIVE', 'FINANCE', 'HR', 'IT', 'MEDIA', 'BEAUTY'].some(
        keyword => unit.unit_code.includes(keyword)
      );
      
      const newParent = isOffice ? office.id : mfg.id;
      const parentCode = isOffice ? 'DIREKTUR_OFFICE' : 'DIREKTUR_MANUFACTURING';
      
      await connection.execute(
        'UPDATE organizational_units SET parent_id = ?, path = ? WHERE id = ?',
        [newParent, `/OWNER/${parentCode}/${unit.unit_code}`, unit.id]
      );
      console.log(`  ✓ Fixed ${unit.unit_name} → ${isOffice ? 'Office' : 'Manufacturing'}`);
    }

    // 5. Show final clean structure
    console.log('\n=== FINAL CLEAN STRUCTURE ===\n');
    const [finalUnits] = await connection.execute(`
      SELECT 
        id, unit_code, unit_name, level, parent_id,
        (SELECT COUNT(*) FROM users WHERE org_unit_id = organizational_units.id AND is_active = 1) as members,
        (SELECT unit_name FROM organizational_units p WHERE p.id = organizational_units.parent_id) as parent_name
      FROM organizational_units 
      WHERE is_active = 1
      ORDER BY level, parent_id, unit_name
    `);

    const grouped = {};
    finalUnits.forEach(u => {
      if (!grouped[u.level]) grouped[u.level] = [];
      grouped[u.level].push(u);
    });

    Object.keys(grouped).sort().forEach(level => {
      console.log(`\n--- Level ${level} ---`);
      grouped[level].forEach(u => {
        const indent = '  '.repeat(parseInt(level));
        console.log(`${indent}${u.unit_name} (${u.members} members)${u.parent_name ? ` [under: ${u.parent_name}]` : ''}`);
      });
    });

    console.log('\n✅ Hierarchy fixed successfully!\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

finalFixHierarchy();
