// Script untuk import perubahan dari MD ke database
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function importOrgFromMd() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n📥 Importing organizational structure from MD...\n');

    // Read MD file
    const md = fs.readFileSync('ORGANIZATIONAL_STRUCTURE_EDITABLE.md', 'utf8');

    // Parse units from MD
    const unitRegex = /### \[ID:(\d+)\] (.+?)\n\n- \*\*Code:\*\* `(.+?)`\n- \*\*Type:\*\* `(.+?)`\n- \*\*Office Type:\*\* `(.+?)`\n- \*\*Parent:\*\* (.+?)\n- \*\*Color:\*\* `(.+?)`\n- \*\*Icon:\*\* `(.+?)`\n- \*\*Level:\*\* (\d+)\n- \*\*Sort Order:\*\* (\d+)(?:\n- \*\*Description:\*\* (.+?))?/g;

    const units = [];
    let match;
    
    while ((match = unitRegex.exec(md)) !== null) {
      const [, id, name, code, type, officeType, parent, color, icon, level, sortOrder, description] = match;
      
      units.push({
        id: parseInt(id),
        unit_name: name,
        unit_code: code,
        unit_type: type,
        office_type: officeType === 'none' ? null : officeType,
        color,
        icon,
        level: parseInt(level),
        sort_order: parseInt(sortOrder),
        description: description || null
      });
    }

    console.log(`Found ${units.length} units to update\n`);

    // Update each unit
    let updated = 0;
    let errors = 0;

    for (const unit of units) {
      try {
        await connection.execute(`
          UPDATE organizational_units 
          SET 
            unit_name = ?,
            unit_type = ?,
            office_type = ?,
            color = ?,
            icon = ?,
            sort_order = ?,
            description = ?
          WHERE id = ?
        `, [
          unit.unit_name,
          unit.unit_type,
          unit.office_type,
          unit.color,
          unit.icon,
          unit.sort_order,
          unit.description,
          unit.id
        ]);

        console.log(`✓ Updated: [${unit.id}] ${unit.unit_name}`);
        updated++;
      } catch (error) {
        console.error(`✗ Error updating [${unit.id}] ${unit.unit_name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} units`);
    console.log(`   ❌ Errors: ${errors} units`);

    if (errors === 0) {
      console.log(`\n✅ Import complete! All changes applied successfully.`);
      console.log(`\n📝 Next: Run 'node scripts/verify-structure.js' to verify\n`);
    } else {
      console.log(`\n⚠️  Import completed with errors. Please check the log above.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

importOrgFromMd();
