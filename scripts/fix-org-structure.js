// Script untuk memperbaiki struktur organisasi
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixOrgStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n=== FIXING ORGANIZATIONAL STRUCTURE ===\n');
    
    // 1. Delete empty units (no members, no children, level > 2)
    console.log('Step 1: Deleting empty units...');
    const [emptyUnits] = await connection.execute(`
      SELECT id, unit_code, unit_name, level
      FROM organizational_units 
      WHERE is_active = 1
        AND level > 2
        AND id NOT IN (SELECT DISTINCT parent_id FROM organizational_units WHERE parent_id IS NOT NULL)
        AND id NOT IN (SELECT DISTINCT org_unit_id FROM users WHERE org_unit_id IS NOT NULL AND is_active = 1)
      ORDER BY level DESC
    `);

    console.log(`Found ${emptyUnits.length} empty units to delete`);
    
    for (const unit of emptyUnits) {
      await connection.execute('DELETE FROM organizational_units WHERE id = ?', [unit.id]);
      console.log(`  ✓ Deleted: ${unit.unit_name} (${unit.unit_code})`);
    }

    // 2. Merge Myklon units
    console.log('\nStep 2: Merging Myklon units...');
    const [myklonUnits] = await connection.execute(`
      SELECT id, unit_code, unit_name 
      FROM organizational_units 
      WHERE unit_code LIKE 'MYKLON%' AND is_active = 1
      ORDER BY unit_code
    `);

    if (myklonUnits.length > 1) {
      const mainMyklon = myklonUnits.find(u => u.unit_code === 'MYKLON');
      if (mainMyklon) {
        for (const unit of myklonUnits) {
          if (unit.id !== mainMyklon.id) {
            // Move members to main Myklon
            await connection.execute(
              'UPDATE users SET org_unit_id = ? WHERE org_unit_id = ? AND is_active = 1',
              [mainMyklon.id, unit.id]
            );
            // Delete duplicate
            await connection.execute('DELETE FROM organizational_units WHERE id = ?', [unit.id]);
            console.log(`  ✓ Merged ${unit.unit_name} into Myklon`);
          }
        }
      }
    }

    // 3. Get parent IDs for reorganization
    const [parents] = await connection.execute(`
      SELECT id, unit_code, unit_name 
      FROM organizational_units 
      WHERE unit_code IN ('DIREKTUR_OFFICE', 'DIREKTUR_MANUFACTURING')
    `);

    const officeParent = parents.find(p => p.unit_code === 'DIREKTUR_OFFICE');
    const mfgParent = parents.find(p => p.unit_code === 'DIREKTUR_MANUFACTURING');

    if (!officeParent || !mfgParent) {
      console.log('\n⚠️  Warning: Parent units not found. Skipping reorganization.');
    } else {
      // 4. Reorganize office units
      console.log('\nStep 3: Reorganizing office units...');
      const officeUnits = [
        'ADMINISTRATION', 'BUSINESS_DEVELOPMENT', 'CREATIVE', 'FINANCE',
        'FINANCE__ACCOUNTING_MANAGER', 'HUMAN_RESOURCES_MANAGER', 
        'IT_SUPPORT', 'MEDIA', 'BEAUTYLATORY', 'GENERAL_MANAGER'
      ];

      for (const code of officeUnits) {
        const [units] = await connection.execute(
          'SELECT id, unit_name FROM organizational_units WHERE unit_code = ? AND is_active = 1',
          [code]
        );
        if (units.length > 0) {
          const unit = units[0];
          await connection.execute(
            'UPDATE organizational_units SET parent_id = ?, level = 2, path = ? WHERE id = ?',
            [officeParent.id, `/OWNER/DIREKTUR_OFFICE/${code}`, unit.id]
          );
          console.log(`  ✓ Moved ${unit.unit_name} under Office`);
        }
      }

      // 5. Reorganize manufacturing units
      console.log('\nStep 4: Reorganizing manufacturing units...');
      const mfgUnits = [
        'PRODUCTION', 'PRODUCTION_MANAGER', 'QUALITY_CONTROL', 'KEPALA_QUALITY_CONTROL',
        'RESEARCH_AND_DEVELOPMENT', 'PRODUCT_DEVELOPMENT_MANAGER',
        'PURCHASING', 'GA__WAREHOUSE', 'GA__WAREHOUSE_MANAGER', 'GA__SUPPORT', 'GA__TECHNICIAN',
        'REGULATION', 'MYKLON', 'PJT', 'PJT__QA_MANAGER', 'STAFF_APOTEKER', 'WAREHOUSE', 'DIREKTUR'
      ];

      for (const code of mfgUnits) {
        const [units] = await connection.execute(
          'SELECT id, unit_name FROM organizational_units WHERE unit_code = ? AND is_active = 1',
          [code]
        );
        if (units.length > 0) {
          const unit = units[0];
          await connection.execute(
            'UPDATE organizational_units SET parent_id = ?, level = 2, path = ? WHERE id = ?',
            [mfgParent.id, `/OWNER/DIREKTUR_MANUFACTURING/${code}`, unit.id]
          );
          console.log(`  ✓ Moved ${unit.unit_name} under Manufacturing`);
        }
      }
    }

    // 6. Final cleanup - delete remaining orphaned units
    console.log('\nStep 5: Final cleanup...');
    const [orphans] = await connection.execute(`
      SELECT id, unit_code, unit_name 
      FROM organizational_units 
      WHERE is_active = 1
        AND level > 2
        AND id NOT IN (SELECT DISTINCT parent_id FROM organizational_units WHERE parent_id IS NOT NULL)
        AND id NOT IN (SELECT DISTINCT org_unit_id FROM users WHERE org_unit_id IS NOT NULL AND is_active = 1)
    `);

    for (const unit of orphans) {
      await connection.execute('DELETE FROM organizational_units WHERE id = ?', [unit.id]);
      console.log(`  ✓ Deleted orphan: ${unit.unit_name}`);
    }

    console.log('\n✅ Structure fixed successfully!\n');

    // Show final structure
    const [finalUnits] = await connection.execute(`
      SELECT 
        id, unit_code, unit_name, unit_type, level,
        (SELECT COUNT(*) FROM users WHERE org_unit_id = organizational_units.id AND is_active = 1) as members
      FROM organizational_units 
      WHERE is_active = 1
      ORDER BY level, sort_order, unit_name
    `);

    console.log('=== FINAL STRUCTURE ===\n');
    finalUnits.forEach(u => {
      const indent = '  '.repeat(u.level);
      console.log(`${indent}${u.unit_name} (${u.members} members)`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

fixOrgStructure();
