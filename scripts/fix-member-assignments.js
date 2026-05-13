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

  console.log('\n🔧 Fixing Member Assignments...\n');

  // Show current assignments with unit names
  const [current] = await c.execute(`
    SELECT ous.username, u.full_name, u.job_position, ou.id as unit_id, ou.unit_name
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    ORDER BY ou.unit_name, u.full_name
  `);

  console.log('Current assignments:\n');
  current.forEach(r => {
    console.log(`  [${r.unit_id}] ${r.unit_name} ← ${r.full_name} (${r.job_position})`);
  });

  // ─── PROBLEMS TO FIX ───────────────────────────────────────────────────────
  // 1. apt. RINA & MUHAMMAD TAUFIQ are in PJT (id:65) but should be in Divisi PJT - QA Manager (id:48)
  // 2. AI SRI, NURUL HUSNUL, TEGUH are in divisi Administration (id:58) which is Manufacturing
  //    They should be in a separate Office Administration unit
  // 3. Check all job_position vs unit mismatches

  console.log('\n\n🔍 Checking mismatches...\n');

  // Get unit IDs
  const [units] = await c.execute(`
    SELECT id, unit_name, parent_id,
      (SELECT unit_name FROM organizational_units WHERE id = ou.parent_id) as parent_name
    FROM organizational_units ou
    ORDER BY unit_name
  `);

  const unitMap = {};
  units.forEach(u => { unitMap[u.unit_name] = u.id; });

  // Fix 1: Move PJT members (apt. RINA, MUHAMMAD TAUFIQ) to Divisi PJT - QA Manager
  // They have job_position = 'PJT' so they belong in PJT unit (id:65) - that's correct
  // But the issue is they show under "PJT" leaf node which is correct per structure
  // The real issue: "Divisi PJT - QA Manager" should show them aggregated

  // Fix 2: divisi Administration (id:58) is under Factory General Manager (Manufacturing)
  //         AI SRI, NURUL HUSNUL, TEGUH have job_position = 'Administration' (Office)
  //         They should be in a different unit - let's check if there's an Office Administration

  const [adminUnits] = await c.execute(`
    SELECT ou.id, ou.unit_name, p.unit_name as parent_name
    FROM organizational_units ou
    LEFT JOIN organizational_units p ON p.id = ou.parent_id
    WHERE ou.unit_name LIKE '%Administration%'
  `);
  console.log('Administration units:');
  adminUnits.forEach(u => console.log(`  [${u.id}] ${u.unit_name} (under: ${u.parent_name})`));

  // The Office side doesn't have a divisi Administration - it was removed in rebuild
  // We need to create one under Office, or reassign these 3 to the correct Office unit
  // Looking at the structure doc: Office has divisi Designer, media, IT Support, marketing & sales,
  // finance, creative, marketing, research & development, business development
  // There's NO "divisi Administration" in Office side!
  // These 3 people (Administration job position) should probably be under a new unit
  // OR they belong to the Manufacturing divisi Administration

  // Let's check their actual job positions
  const [adminPeople] = await c.execute(`
    SELECT u.username, u.full_name, u.job_position, ou.unit_name as current_unit
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    WHERE u.job_position LIKE '%Administration%'
  `);
  console.log('\nPeople with Administration job position:');
  adminPeople.forEach(p => console.log(`  ${p.full_name} (${p.job_position}) → currently in: ${p.current_unit}`));

  // Fix: Create divisi Administration under Office if not exists, then move them
  const officeId = unitMap['Office'];
  console.log(`\nOffice unit ID: ${officeId}`);

  // Check if Office Administration exists
  const [officeAdmin] = await c.execute(`
    SELECT id FROM organizational_units 
    WHERE unit_name = 'divisi Administration' AND parent_id = ?
  `, [officeId]);

  let officeAdminId;
  if (officeAdmin.length === 0) {
    console.log('\n📝 Creating divisi Administration under Office...');
    const [result] = await c.execute(`
      INSERT INTO organizational_units 
      (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['DIVISI_ADMINISTRATION_OFFICE', 'Division Administration', 'division', officeId, 4, '/OWNER/OFFICE/DIREKTUR_OFFICE/OFFICE/DIVISI_ADMINISTRATION_OFFICE', 0, '#7c3aed', 'building-2', 1]);
    officeAdminId = result.insertId;
    console.log(`  ✅ Created with ID: ${officeAdminId}`);
  } else {
    officeAdminId = officeAdmin[0].id;
    console.log(`\n✅ Office Administration already exists (ID: ${officeAdminId})`);
  }

  // Move AI SRI, NURUL HUSNUL, TEGUH from Manufacturing divisi Administration to Office divisi Administration
  const mfgAdminId = unitMap['divisi Administration']; // This is the Manufacturing one (id:58)
  
  // Find the manufacturing admin id specifically (under Factory General Manager)
  const [mfgAdmin] = await c.execute(`
    SELECT ou.id FROM organizational_units ou
    JOIN organizational_units p ON p.id = ou.parent_id
    WHERE ou.unit_name = 'divisi Administration' AND p.unit_name = 'Factory General Manager'
  `);
  
  const mfgAdminUnitId = mfgAdmin.length > 0 ? mfgAdmin[0].id : null;
  console.log(`\nManufacturing divisi Administration ID: ${mfgAdminUnitId}`);
  console.log(`Office divisi Administration ID: ${officeAdminId}`);

  if (mfgAdminUnitId) {
    // Get people currently in Manufacturing Administration
    const [mfgAdminPeople] = await c.execute(`
      SELECT ous.username, u.full_name, u.job_position
      FROM org_unit_staff ous
      JOIN users u ON u.username = ous.username
      WHERE ous.org_unit_id = ?
    `, [mfgAdminUnitId]);

    console.log(`\nPeople in Manufacturing Administration:`);
    mfgAdminPeople.forEach(p => console.log(`  ${p.full_name} (${p.job_position})`));

    // Move Office admin people (those with job_position = 'Administration') to Office unit
    for (const person of mfgAdminPeople) {
      if (person.job_position === 'Administration') {
        // Remove from manufacturing admin
        await c.execute('DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?', [mfgAdminUnitId, person.username]);
        // Add to office admin
        await c.execute('INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role) VALUES (?, ?, ?)', [officeAdminId, person.username, 'staff']);
        console.log(`  ✅ Moved ${person.full_name} → Office divisi Administration`);
      }
    }
  }

  console.log('\n✅ Done! Refresh the page to see changes.\n');
  await c.end();
})();
