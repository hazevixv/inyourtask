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

  const assign = async (username, unitId) => {
    await c.execute('INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role) VALUES (?, ?, ?)', [unitId, username, 'staff']);
  };
  const remove = async (username, unitId) => {
    await c.execute('DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?', [unitId, username]);
  };
  const move = async (username, fromId, toId) => {
    await remove(username, fromId);
    await assign(username, toId);
  };

  console.log('\n🔧 PERFECT FIX 2 - Correct Usernames\n');

  // apt2 = apt. RINA SUSANTI S.Farm (PJT - QA Manager)
  // She is in PJT (65) - should be in Divisi PJT - QA Manager (48)
  await move('apt2', 65, 48);
  console.log('✅ apt2 (apt. RINA) → Divisi PJT - QA Manager (48)');

  // apt = apt. IVANA AZIZATUN NADHIROH S.Farm (Product Development Manager)
  // She was wrongly added to Divisi PJT - QA Manager (48) in previous script
  // Check current state
  const [aptState] = await c.execute(`
    SELECT ou.unit_name FROM org_unit_staff ous 
    JOIN organizational_units ou ON ou.id = ous.org_unit_id 
    WHERE ous.username = 'apt'
  `);
  console.log('apt (IVANA) current units:', aptState.map(r => r.unit_name));
  // Remove from PJT - QA Manager if there
  await remove('apt', 48);
  // Ensure in Product Development Manager (49)
  await assign('apt', 49);
  console.log('✅ apt (apt. IVANA) → Product Development Manager (49) only');

  // muhammad2 = MUHAMMAD TAUFIQ ANWARI (PJT)
  // He is in MYKLON (39) - should only be in PJT (65)
  await remove('muhammad2', 39);
  await assign('muhammad2', 65);
  console.log('✅ muhammad2 (MUHAMMAD TAUFIQ) → PJT (65) only');

  // Also fix the wrong 'apt' that was moved to PJT in previous script
  const [aptPjtState] = await c.execute(`SELECT id FROM org_unit_staff WHERE username = 'apt' AND org_unit_id = 65`);
  if (aptPjtState.length > 0) {
    await remove('apt', 65);
    console.log('✅ apt (IVANA) removed from PJT (65)');
  }

  // Also fix 'apt' that was moved to Divisi PJT - QA Manager in previous script
  const [aptQaState] = await c.execute(`SELECT id FROM org_unit_staff WHERE username = 'apt' AND org_unit_id = 48`);
  if (aptQaState.length > 0) {
    await remove('apt', 48);
    console.log('✅ apt (IVANA) removed from Divisi PJT - QA Manager (48)');
  }

  // ── FINAL VERIFICATION ──────────────────────────────────────────────────────
  console.log('\n─── Final State ───\n');

  const [allAssign] = await c.execute(`
    SELECT u.full_name, u.job_position, ou.unit_name
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    WHERE u.is_active = 1
    ORDER BY ou.unit_name, u.full_name
  `);

  let lastUnit = '';
  allAssign.forEach(a => {
    if (a.unit_name !== lastUnit) {
      console.log(`\n  📁 ${a.unit_name}:`);
      lastUnit = a.unit_name;
    }
    console.log(`     └─ ${a.full_name} (${a.job_position})`);
  });

  // Unassigned
  const [unassigned] = await c.execute(`
    SELECT u.username, u.full_name, u.job_position
    FROM users u
    WHERE u.is_active = 1
    AND u.username NOT IN (SELECT DISTINCT username FROM org_unit_staff)
    AND u.username NOT IN ('admin', 'guest', 'administrator')
    ORDER BY u.full_name
  `);

  if (unassigned.length > 0) {
    console.log('\n\n  ⚠️  STILL UNASSIGNED:');
    unassigned.forEach(u => console.log(`     ${u.full_name} (${u.job_position}) [${u.username}]`));
  } else {
    console.log('\n\n  ✅ All users assigned!');
  }

  // Multi-unit
  const [multi] = await c.execute(`
    SELECT u.full_name, GROUP_CONCAT(ou.unit_name SEPARATOR ' | ') as units, COUNT(*) as cnt
    FROM org_unit_staff ous
    JOIN users u ON u.username = ous.username
    JOIN organizational_units ou ON ou.id = ous.org_unit_id
    GROUP BY ous.username HAVING cnt > 1
  `);
  if (multi.length > 0) {
    console.log('\n  ℹ️  MULTI-UNIT (intentional):');
    multi.forEach(m => console.log(`     ${m.full_name}: ${m.units}`));
  }

  console.log('\n✅ PERFECT FIX COMPLETE!\n');
  await c.end();
})();
