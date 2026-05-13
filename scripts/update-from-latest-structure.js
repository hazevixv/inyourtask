// Script untuk update organizational structure dari struktur terbaru
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateFromLatestStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n🔧 Updating Organizational Structure from Latest Document...\n');

    // Mapping dari nama lama ke nama baru (sesuai struktur terbaru)
    const updates = [
      // OFFICE DIVISIONS - tambah prefix "divisi"
      { old: 'Administration', new: 'divisi Administration', type: 'division' },
      { old: 'Beautylatory', new: 'divisi Beautylatory', type: 'division' },
      { old: 'Business Development', new: 'divisi business development', type: 'division' },
      { old: 'Creative', new: 'divisi creative', type: 'division' },
      { old: 'Finance', new: 'divisi finance', type: 'division' },
      { old: 'IT Support', new: 'divisi IT Support', type: 'division' },
      { old: 'Media', new: 'divisi media', type: 'division' },
      { old: 'Marketing', new: 'divisi marketing', type: 'division' },
      { old: 'Research & Development', new: 'divisi research & development', type: 'division' },
      { old: 'Designer', new: 'divisi Designer', type: 'division' },
      { old: 'Marketing & Sales', new: 'divisi marketing & sales', type: 'division' },
      
      // MANUFACTURING DIVISIONS - tambah prefix "divisi"
      { old: 'Administration (Manufacturing)', new: 'divisi Administration', type: 'division' },
      { old: 'Legal', new: 'divisi Legal', type: 'division' },
      { old: 'PPIC', new: 'divisi PPIC', type: 'division' },
      { old: 'Production', new: 'divisi Production', type: 'division' },
      { old: 'Purchasing', new: 'divisi Purchasing', type: 'division' },
      { old: 'Quality Control', new: 'divisi Quality Control', type: 'division' },
      { old: 'Regulation', new: 'divisi Regulation', type: 'division' },
      { old: 'Research and Development', new: 'divisi Research and Development', type: 'division' },
      { old: 'Warehouse', new: 'divisi Warehouse', type: 'division' },
      { old: 'Marketing & Sales (Manufacturing)', new: 'divisi marketing & sales', type: 'division' },
      
      // DEPARTMENTS & TEAMS
      { old: 'Finance - Accounting Manager', new: 'Finance - Accounting Manager', type: 'department' },
      { old: 'Finance - Staff', new: 'Finance- Staff', type: 'department' },
      { old: 'Human Resources Manager', new: 'Human Resources Manager', type: 'department' },
      { old: 'GA - Support', new: 'GA - Support', type: 'department' },
      { old: 'GA - Technician', new: 'GA - Technician', type: 'department' },
      { old: 'GA - Warehouse', new: 'GA - Warehouse', type: 'department' },
      { old: 'GA - Warehouse Manager', new: 'GA - Warehouse Manager', type: 'department' },
      
      // MANAGERS
      { old: 'Manager BALEIDE', new: 'manager BALEIDE', type: 'team' },
      { old: 'Manager RAYPACK', new: 'manager RAYPACK', type: 'team' },
      { old: 'Manager LABCOS', new: 'manager LABCOS', type: 'team' },
      { old: 'Manager RAY ACADEMY', new: 'manager RAY ACADEMY', type: 'team' },
      { old: 'Manager EBOOK', new: 'manager EBOOK', type: 'team' },
      { old: 'Manager Team', new: 'manager workspace', type: 'team' },
      { old: 'Manager RAYMEDIA', new: 'manager RAYMEDIA', type: 'team' },
      { old: 'Manager B2C', new: 'manager B2C', type: 'team' },
      { old: 'Manager B2B', new: 'manager B2B', type: 'team' },
      { old: 'Manager B2B2C', new: 'manager B2B2C', type: 'team' },
      
      // BRANDS & PRODUCTS
      { old: 'BEAUTYLATORY Store', new: 'BEAUTYLATORY Store', type: 'product' },
      { old: 'BEAUTYLATORY Produk', new: 'BEAUTYLATORY produk', type: 'product' },
      { old: 'Myklon', new: 'MYKLON', type: 'product' },
      
      // PARENT UNITS
      { old: 'Primary Office Director', new: 'primary office director', type: 'company' },
      { old: 'Manufacturing Director', new: 'manufacturing director', type: 'company' },
      { old: 'Office', new: 'Office', type: 'division' },
      { old: 'Business', new: 'Business', type: 'division' },
      { old: 'UNIT BISNIS', new: 'UNIT BISNIS', type: 'department' },
      { old: 'BRAND', new: 'BRAND', type: 'department' },
    ];

    let updated = 0;
    let notFound = 0;

    for (const update of updates) {
      try {
        // Cari unit berdasarkan nama lama
        const [units] = await connection.execute(
          'SELECT id, unit_name, unit_type FROM organizational_units WHERE unit_name = ?',
          [update.old]
        );

        if (units.length > 0) {
          const unit = units[0];
          
          // Update nama dan type jika berbeda
          if (unit.unit_name !== update.new || unit.unit_type !== update.type) {
            await connection.execute(
              'UPDATE organizational_units SET unit_name = ?, unit_type = ? WHERE id = ?',
              [update.new, update.type, unit.id]
            );
            console.log(`  ✅ Updated: "${update.old}" → "${update.new}" (${update.type})`);
            updated++;
          } else {
            console.log(`  ⏭️  Skipped: "${update.old}" (already correct)`);
          }
        } else {
          console.log(`  ⚠️  Not found: "${update.old}"`);
          notFound++;
        }
      } catch (error) {
        console.log(`  ❌ Error updating "${update.old}": ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Updated: ${updated} units`);
    console.log(`  ⏭️  Skipped: ${updates.length - updated - notFound} units (already correct)`);
    console.log(`  ⚠️  Not found: ${notFound} units`);

    // Verify hasil update
    console.log('\n🔍 Verifying updates...\n');
    
    const [divisions] = await connection.execute(`
      SELECT unit_name, unit_type 
      FROM organizational_units 
      WHERE unit_type = 'division' 
      ORDER BY unit_name
    `);
    
    console.log('📁 All Divisions:');
    divisions.forEach(d => {
      const hasPrefix = d.unit_name.toLowerCase().startsWith('divisi ');
      const icon = hasPrefix ? '✅' : '⚠️';
      console.log(`  ${icon} ${d.unit_name}`);
    });

    console.log('\n✅ Update Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

updateFromLatestStructure();
