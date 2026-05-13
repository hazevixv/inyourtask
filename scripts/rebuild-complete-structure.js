// Script untuk rebuild complete organizational structure dari dokumen terbaru
const mysql = require('mysql2/promise');
require('dotenv').config();

async function rebuildCompleteStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n🔧 Rebuilding Complete Organizational Structure...\n');

    // Step 1: Backup existing members
    console.log('📦 Backing up existing member assignments...');
    const [members] = await connection.execute(`
      SELECT org_unit_id, username, role, assigned_by 
      FROM org_unit_staff
    `);
    console.log(`  ✅ Backed up ${members.length} member assignments\n`);

    // Step 2: Delete all units except Owner
    console.log('🗑️  Clearing existing structure (keeping Owner)...');
    await connection.execute('DELETE FROM organizational_units WHERE id != 1');
    console.log('  ✅ Cleared\n');

    // Step 3: Build new structure
    console.log('🏗️  Building new structure...\n');

    const units = [];
    let id = 2;

    // Level 1: Main Companies
    units.push({ id: id++, code: 'WORKSPACE_OFFICE', name: 'workspace corporation (office)', type: 'company', parent: 1, level: 1 });
    units.push({ id: id++, code: 'LUNARAY_MANUFACTURING', name: 'lunaray beauty factory  & Dian Indah Abadi (manufacturing cosmetics)', type: 'company', parent: 1, level: 1 });

    const officeId = 2;
    const manufacturingId = 3;

    // Level 2: Direktur
    units.push({ id: id++, code: 'DIREKTUR_OFFICE', name: 'Direktur', type: 'division', parent: officeId, level: 2 });
    units.push({ id: id++, code: 'DIREKTUR_MANUFACTURING', name: 'Direktur', type: 'division', parent: manufacturingId, level: 2 });

    const direkturOfficeId = 4;
    const direkturManufacturingId = 5;

    // Level 3: Office Main Divisions
    units.push({ id: id++, code: 'OFFICE', name: 'Office', type: 'division', parent: direkturOfficeId, level: 3 });
    units.push({ id: id++, code: 'BUSINESS', name: 'Business', type: 'division', parent: direkturOfficeId, level: 3 });

    const officeDiv = 6;
    const businessDiv = 7;

    // Level 4: Office Sub-divisions
    units.push({ id: id++, code: 'DIVISI_DESIGNER', name: 'divisi Designer', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_MEDIA', name: 'divisi media', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_IT_SUPPORT', name: 'divisi IT Support', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_MARKETING_SALES', name: 'divisi marketing & sales', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_FINANCE', name: 'divisi finance', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_CREATIVE', name: 'divisi creative', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_MARKETING', name: 'divisi marketing', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_RND', name: 'divisi research & development', type: 'division', parent: officeDiv, level: 4 });
    units.push({ id: id++, code: 'DIVISI_BUSINESS_DEV', name: 'divisi business development', type: 'division', parent: officeDiv, level: 4 });

    const financeId = 12;

    // Level 5: Finance Sub-departments
    units.push({ id: id++, code: 'FINANCE_ACCOUNTING_MGR', name: 'Finance - Accounting Manager', type: 'department', parent: financeId, level: 5 });
    units.push({ id: id++, code: 'FINANCE_STAFF', name: 'Finance- Staff', type: 'department', parent: financeId, level: 5 });
    units.push({ id: id++, code: 'HR_MANAGER', name: 'Human Resources Manager', type: 'department', parent: financeId, level: 5 });

    // Level 4: Business Sub-divisions
    units.push({ id: id++, code: 'UNIT_BISNIS', name: 'UNIT BISNIS', type: 'department', parent: businessDiv, level: 4 });
    units.push({ id: id++, code: 'BRAND', name: 'BRAND', type: 'department', parent: businessDiv, level: 4 });

    const unitBisnisId = 20;
    const brandId = 21;

    // Level 5: Unit Bisnis Managers
    units.push({ id: id++, code: 'MGR_BALEIDE', name: 'manager BALEIDE', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_RAYPACK', name: 'manager RAYPACK', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_LABCOS', name: 'manager LABCOS', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_RAY_ACADEMY', name: 'manager RAY ACADEMY', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_EBOOK', name: 'manager EBOOK', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_WORKSPACE', name: 'manager workspace', type: 'team', parent: unitBisnisId, level: 5 });
    units.push({ id: id++, code: 'MGR_RAYMEDIA', name: 'manager RAYMEDIA', type: 'team', parent: unitBisnisId, level: 5 });

    // Level 5: Brand Managers
    units.push({ id: id++, code: 'MGR_B2C', name: 'manager B2C', type: 'team', parent: brandId, level: 5 });
    units.push({ id: id++, code: 'MGR_B2B', name: 'manager B2B', type: 'team', parent: brandId, level: 5 });
    units.push({ id: id++, code: 'MGR_B2B2C', name: 'manager B2B2C', type: 'team', parent: brandId, level: 5 });

    const mgrB2C = 29;
    const mgrB2B = 30;
    const mgrB2B2C = 31;

    // Level 6: B2C Products
    units.push({ id: id++, code: 'BEAUTYLATORY_STORE', name: 'BEAUTYLATORY Store', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'BEAUTYLATORY_PRODUK', name: 'BEAUTYLATORY produk', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'MOMMYLATORY', name: 'MOMMYLATORY', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'BABYLATORY', name: 'BABYLATORY', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'DERMOND', name: 'DERMOND', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'ADHWA', name: 'ADHWA', type: 'product', parent: mgrB2C, level: 6 });
    units.push({ id: id++, code: 'SHELUNA', name: 'SHELUNA', type: 'product', parent: mgrB2C, level: 6 });

    // Level 6: B2B Products
    units.push({ id: id++, code: 'MYKLON', name: 'MYKLON', type: 'product', parent: mgrB2B, level: 6 });
    units.push({ id: id++, code: 'CKK', name: 'CKK', type: 'product', parent: mgrB2B, level: 6 });

    // Level 6: B2B2C Products
    units.push({ id: id++, code: 'MAZRA', name: 'MAZRA', type: 'product', parent: mgrB2B2C, level: 6 });
    units.push({ id: id++, code: 'HAILOGY', name: 'HAILOGY', type: 'product', parent: mgrB2B2C, level: 6 });
    units.push({ id: id++, code: 'INALOVERS', name: 'INALOVERS SANTRIPRENEUR', type: 'product', parent: mgrB2B2C, level: 6 });
    units.push({ id: id++, code: 'DERMALINK', name: 'DERMALINK', type: 'product', parent: mgrB2B2C, level: 6 });

    // MANUFACTURING STRUCTURE
    // Level 3: Manufacturing Main Divisions
    units.push({ id: id++, code: 'MARKETING_SALES_MGR', name: 'marketing & sales manager', type: 'department', parent: direkturManufacturingId, level: 3 });
    units.push({ id: id++, code: 'DIVISI_GENERAL_AFFAIR', name: 'divisi general affair', type: 'division', parent: direkturManufacturingId, level: 3 });
    units.push({ id: id++, code: 'FACTORY_GENERAL_MGR', name: 'Factory General Manager', type: 'department', parent: direkturManufacturingId, level: 3 });
    units.push({ id: id++, code: 'DIVISI_PJT_QA', name: 'Divisi PJT - QA Manager', type: 'department', parent: direkturManufacturingId, level: 3 });
    units.push({ id: id++, code: 'PRODUCT_DEV_MGR', name: 'Product Development Manager', type: 'department', parent: direkturManufacturingId, level: 3 });
    units.push({ id: id++, code: 'PRODUCTION_MGR', name: 'Production Manager', type: 'department', parent: direkturManufacturingId, level: 3 });

    const marketingSalesMgr = 46;
    const generalAffair = 47;
    const factoryGeneralMgr = 48;
    const pjtQaMgr = 49;
    const productDevMgr = 50;
    const productionMgr = 51;

    // Level 4: Marketing & Sales sub-units
    units.push({ id: id++, code: 'STAFF_APOTEKER', name: 'Staff Apoteker', type: 'team', parent: marketingSalesMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_MARKETING_SALES_MFG', name: 'divisi marketing & sales', type: 'division', parent: marketingSalesMgr, level: 4 });

    // Level 4: General Affair sub-units
    units.push({ id: id++, code: 'GA_TECHNICIAN', name: 'GA - Technician', type: 'team', parent: generalAffair, level: 4 });
    units.push({ id: id++, code: 'GA_SUPPORT', name: 'GA - Support', type: 'team', parent: generalAffair, level: 4 });
    units.push({ id: id++, code: 'GA_WAREHOUSE', name: 'GA - Warehouse', type: 'team', parent: generalAffair, level: 4 });
    units.push({ id: id++, code: 'GA_WAREHOUSE_MGR', name: 'GA - Warehouse Manager', type: 'team', parent: generalAffair, level: 4 });

    // Level 4: Factory General Manager sub-units
    units.push({ id: id++, code: 'DIVISI_PPIC', name: 'divisi PPIC', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_ADMINISTRATION_MFG', name: 'divisi Administration', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_LEGAL', name: 'divisi Legal', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_PURCHASING', name: 'divisi Purchasing', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_QC', name: 'divisi Quality Control', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_REGULATION', name: 'divisi Regulation', type: 'division', parent: factoryGeneralMgr, level: 4 });
    units.push({ id: id++, code: 'DIVISI_WAREHOUSE_MFG', name: 'divisi Warehouse', type: 'division', parent: factoryGeneralMgr, level: 4 });

    // Level 4: PJT - QA Manager sub-units
    units.push({ id: id++, code: 'KEPALA_QC', name: 'Kepala Quality Control', type: 'team', parent: pjtQaMgr, level: 4 });
    units.push({ id: id++, code: 'PJT', name: 'PJT', type: 'team', parent: pjtQaMgr, level: 4 });

    // Level 4: Product Development Manager sub-units
    units.push({ id: id++, code: 'DIVISI_RND_MFG', name: 'divisi Research and Development', type: 'division', parent: productDevMgr, level: 4 });

    // Level 4: Production Manager sub-units
    units.push({ id: id++, code: 'DIVISI_PRODUCTION', name: 'divisi Production', type: 'division', parent: productionMgr, level: 4 });

    // Insert all units
    for (const unit of units) {
      const path = await buildPath(connection, unit.parent, unit.code);
      await connection.execute(
        `INSERT INTO organizational_units 
         (id, unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          unit.id, unit.code, unit.name, unit.type, unit.parent, unit.level, path, 0,
          getColor(unit.type), getIcon(unit.type), 1, null
        ]
      );
      console.log(`  ✅ Created: ${unit.name} (${unit.type})`);
    }

    console.log(`\n✅ Created ${units.length} organizational units\n`);

    // Step 4: Restore member assignments (map old IDs to new structure)
    console.log('📦 Restoring member assignments...');
    let restored = 0;
    let failed = 0;

    for (const member of members) {
      try {
        // Try to find matching unit by checking old structure
        const [oldUnit] = await connection.execute(
          'SELECT unit_name FROM organizational_units WHERE id = ?',
          [member.org_unit_id]
        );

        if (oldUnit.length > 0) {
          // Find new unit with same name
          const [newUnit] = await connection.execute(
            'SELECT id FROM organizational_units WHERE unit_name = ?',
            [oldUnit[0].unit_name]
          );

          if (newUnit.length > 0) {
            await connection.execute(
              'INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
              [newUnit[0].id, member.username, member.role, member.assigned_by]
            );
            restored++;
          } else {
            failed++;
          }
        }
      } catch (error) {
        failed++;
      }
    }

    console.log(`  ✅ Restored: ${restored} assignments`);
    console.log(`  ⚠️  Failed: ${failed} assignments\n`);

    console.log('✅ Rebuild Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total units: ${units.length + 1} (including Owner)`);
    console.log(`  - Office divisions: ${units.filter(u => u.parent === officeDiv).length}`);
    console.log(`  - Business units: ${units.filter(u => u.parent === businessDiv).length}`);
    console.log(`  - Manufacturing divisions: ${units.filter(u => u.parent === direkturManufacturingId).length}`);
    console.log(`  - Products: ${units.filter(u => u.type === 'product').length}`);
    console.log(`  - Member assignments: ${restored}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

async function buildPath(connection, parentId, code) {
  if (!parentId) return `/${code}`;
  const [parent] = await connection.execute('SELECT path FROM organizational_units WHERE id = ?', [parentId]);
  if (parent.length === 0) return `/${code}`;
  return `${parent[0].path}/${code}`;
}

function getColor(type) {
  const colors = {
    company: '#dc2626',
    division: '#7c3aed',
    department: '#2563eb',
    team: '#059669',
    product: '#d97706'
  };
  return colors[type] || '#7c3aed';
}

function getIcon(type) {
  const icons = {
    company: 'shield',
    division: 'building-2',
    department: 'briefcase',
    team: 'users',
    product: 'package'
  };
  return icons[type] || 'building-2';
}

rebuildCompleteStructure();
