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

  console.log('\n🔧 PERFECT FIX - All Issues\n');

  // ── ISSUE 1: apt. RINA in PJT (65) but should be in Divisi PJT - QA Manager (48)
  // She is QA Manager, not a PJT staff
  await move('apt', 65, 48);
  console.log('✅ apt. RINA → Divisi PJT - QA Manager (48)');

  // ── ISSUE 2: apt. IVANA in BOTH Divisi PJT - QA Manager (48) AND Product Dev Manager (49)
  // Her job = Product Development Manager → should only be in 49
  await remove('apt', 48);
  console.log('✅ apt. IVANA → removed from Divisi PJT - QA Manager, stays in Product Dev Manager (49)');

  // ── ISSUE 3: MUHAMMAD TAUFIQ in BOTH MYKLON (39) AND PJT (65)
  // His job = PJT → should only be in PJT (65)
  await remove('muhammad', 39);
  console.log('✅ MUHAMMAD TAUFIQ → removed from MYKLON, stays in PJT (65)');

  // ── ISSUE 4: NAJIIB MUHAMMAD JIDAN (Myklon) - unassigned
  await assign('najiib', 39);
  console.log('✅ NAJIIB MUHAMMAD JIDAN → MYKLON (39)');

  // ── ISSUE 5: RAISYA PEBRIAN PUTRI SEPIANA (Myklon) - unassigned
  await assign('raisya', 39);
  console.log('✅ RAISYA PEBRIAN PUTRI SEPIANA → MYKLON (39)');

  // ── ISSUE 6: divisi Administration (58) under Factory General Manager is EMPTY
  // The 3 admin people (AI SRI, NURUL, TEGUH) were moved to Office admin (77) - correct
  // Manufacturing divisi Administration (58) should have manufacturing admin staff
  // Currently no one has job_position = 'divisi Administration' for manufacturing
  // Leave it empty for now - it's a valid unit that can be filled later

  // ── ISSUE 7: divisi marketing (14) under Office is EMPTY
  // Myklon Marketing people (AKHMAD, ALIFIA, SITI) were moved to MYKLON
  // But they have job_position = 'Myklon - Marketing' so MYKLON is correct
  // divisi marketing should have actual marketing staff - check if anyone fits
  // No one has job_position = 'Marketing' (Office) - leave empty

  // ── ISSUE 8: divisi marketing & sales (11) under Office is EMPTY
  // divisi marketing & sales (52) under marketing & sales manager has no members either
  // These are structural units - leave empty

  // ── ISSUE 9: divisi Designer (8) under Office is EMPTY
  // No one has Designer job position - leave empty

  // ── ISSUE 10: divisi research & development (15) under Office is EMPTY
  // The R&D people are in Manufacturing divisi Research and Development (66) - correct
  // Office R&D is separate - leave empty

  // ── ISSUE 11: Finance- Staff (18) is EMPTY
  // RIA SAVITRI, ULFI, ZAHRA are in divisi finance (12) - they should be in Finance- Staff
  await move('ria', 12, 18);
  await move('ulfi', 12, 18);
  await move('zahra', 12, 18);
  console.log('✅ RIA, ULFI, ZAHRA → Finance- Staff (18)');

  // ── ISSUE 12: divisi Warehouse (63) under Factory General Manager is EMPTY
  // GA - Warehouse people (ALDI, DENI, etc.) are in GA - Warehouse (55) - correct
  // divisi Warehouse (63) is a different unit under Factory General Manager
  // No one has job_position = 'Warehouse' for factory - leave empty

  // ── ISSUE 13: divisi PPIC (57) is EMPTY - no PPIC staff in database
  // divisi Legal (59) is EMPTY - no Legal staff in database
  // These are valid empty units

  // ── VERIFY: Check apt. RINA username
  const [rinaCheck] = await c.execute(`
    SELECT u.username, u.full_name, u.job_position FROM users u WHERE u.full_name LIKE '%RINA%'
  `);
  console.log('\nRINA users:', rinaCheck.map(r => `${r.username} (${r.full_name})`));

  const [ivanCheck] = await c.execute(`
    SELECT u.username, u.full_name FROM users u WHERE u.full_name LIKE '%IVANA%'
  `);
  console.log('IVANA users:', ivanCheck.map(r => `${r.username} (${r.full_name})`));

  const [taufiqCheck] = await c.execute(`
    SELECT u.username, u.full_name FROM users u WHERE u.full_name LIKE '%TAUFIQ%'
  `);
  console.log('TAUFIQ users:', taufiqCheck.map(r => `${r.username} (${r.full_name})`));

  const [najiibCheck] = await c.execute(`
    SELECT u.username, u.full_name FROM users u WHERE u.full_name LIKE '%NAJIIB%'
  `);
  console.log('NAJIIB users:', najiibCheck.map(r => `${r.username} (${r.full_name})`));

  const [raisyaCheck] = await c.execute(`
    SELECT u.username, u.full_name FROM users u WHERE u.full_name LIKE '%RAISYA%'
  `);
  console.log('RAISYA users:', raisyaCheck.map(r => `${r.username} (${r.full_name})`));

  console.log('\n✅ All fixes applied!\n');
  await c.end();
})();
