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

  console.log('\n🔧 Fixing ALL Member Assignments...\n');

  // Helper: get unit id by name + optional parent name
  async function getUnitId(name, parentName = null) {
    let q = 'SELECT ou.id FROM organizational_units ou';
    let params = [name];
    if (parentName) {
      q += ' JOIN organizational_units p ON p.id = ou.parent_id WHERE ou.unit_name = ? AND p.unit_name = ?';
      params.push(parentName);
    } else {
      q += ' WHERE ou.unit_name = ?';
    }
    q += ' LIMIT 1';
    const [rows] = await c.execute(q, params);
    return rows.length > 0 ? rows[0].id : null;
  }

  async function move(username, fromId, toId) {
    if (!toId) { console.log(`  ⚠️  Target unit not found for ${username}`); return; }
    await c.execute('DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?', [fromId, username]);
    await c.execute('INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role) VALUES (?, ?, ?)', [toId, username, 'staff']);
  }

  async function assign(username, toId) {
    if (!toId) { console.log(`  ⚠️  Target unit not found for ${username}`); return; }
    await c.execute('INSERT IGNORE INTO org_unit_staff (org_unit_id, username, role) VALUES (?, ?, ?)', [toId, username, 'staff']);
  }

  async function removeFrom(username, fromId) {
    await c.execute('DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?', [fromId, username]);
  }

  // ─── GET UNIT IDs ──────────────────────────────────────────────────────────
  const pjtQaMgrId   = await getUnitId('Divisi PJT - QA Manager');
  const pjtId        = await getUnitId('PJT');
  const kepalaQcId   = await getUnitId('Kepala Quality Control');
  const myklonId     = await getUnitId('MYKLON');
  const mklnMktgId   = await getUnitId('divisi marketing');  // Myklon - Marketing people
  const divQcId      = await getUnitId('divisi Quality Control');
  const divRegId     = await getUnitId('divisi Regulation');
  const divWrhId     = await getUnitId('divisi Warehouse');
  const gaSupId      = await getUnitId('GA - Support');
  const gaTechId     = await getUnitId('GA - Technician');
  const gaWrhId      = await getUnitId('GA - Warehouse');
  const gaWrhMgrId   = await getUnitId('GA - Warehouse Manager');
  const prodMgrId    = await getUnitId('Production Manager');
  const divProdId    = await getUnitId('divisi Production');
  const beautyStoreId = await getUnitId('BEAUTYLATORY Store');
  const beautyProdId  = await getUnitId('BEAUTYLATORY produk');
  const officeAdminId = await getUnitId('divisi Administration', 'Office');
  const mfgAdminId    = await getUnitId('divisi Administration', 'Factory General Manager');
  const divFinanceId  = await getUnitId('divisi finance');
  const finAccMgrId   = await getUnitId('Finance - Accounting Manager');
  const hrMgrId       = await getUnitId('Human Resources Manager');
  const prodDevMgrId  = await getUnitId('Product Development Manager');
  const divRndId      = await getUnitId('divisi Research and Development');

  console.log('Unit IDs:');
  console.log(`  Divisi PJT - QA Manager: ${pjtQaMgrId}`);
  console.log(`  PJT: ${pjtId}`);
  console.log(`  Kepala Quality Control: ${kepalaQcId}`);
  console.log(`  MYKLON: ${myklonId}`);
  console.log(`  divisi Quality Control: ${divQcId}`);
  console.log(`  divisi Warehouse: ${divWrhId}`);
  console.log(`  GA - Support: ${gaSupId}`);
  console.log(`  GA - Technician: ${gaTechId}`);
  console.log(`  GA - Warehouse: ${gaWrhId}`);
  console.log(`  GA - Warehouse Manager: ${gaWrhMgrId}`);
  console.log(`  divisi Production: ${divProdId}`);
  console.log(`  Production Manager: ${prodMgrId}`);
  console.log(`  Office divisi Administration: ${officeAdminId}`);
  console.log(`  Mfg divisi Administration: ${mfgAdminId}`);
  console.log(`  divisi finance: ${divFinanceId}`);
  console.log(`  Finance - Accounting Manager: ${finAccMgrId}`);
  console.log(`  Human Resources Manager: ${hrMgrId}`);
  console.log(`  Product Development Manager: ${prodDevMgrId}`);
  console.log(`  divisi Research and Development: ${divRndId}`);

  console.log('\n─── Fixing assignments ───\n');

  // 1. apt. RINA SUSANTI → should be in Divisi PJT - QA Manager (she's QA Manager)
  //    Currently in PJT (id:65) - move to pjtQaMgrId
  await move('apt', pjtId, pjtQaMgrId);
  console.log('✅ apt. RINA SUSANTI → Divisi PJT - QA Manager');

  // 2. MUHAMMAD TAUFIQ ANWARI → job_position = PJT, should stay in PJT
  //    But also in MYKLON - remove from MYKLON
  await removeFrom('muhammad', myklonId);
  console.log('✅ MUHAMMAD TAUFIQ ANWARI → removed from MYKLON, stays in PJT');

  // 3. PEBRIZA RAMANDINI → job_position = Regulation, should be in divisi Regulation
  //    Currently also in MYKLON - remove from MYKLON
  await removeFrom('pebriza', myklonId);
  console.log('✅ PEBRIZA RAMANDINI → removed from MYKLON, stays in divisi Regulation');

  // 4. RIMA HAIFA NANDINI → job_position = Kepala Quality Control
  //    Currently in divisi Quality Control - move to Kepala Quality Control
  await move('rima', divQcId, kepalaQcId);
  console.log('✅ RIMA HAIFA NANDINI → Kepala Quality Control');

  // 5. GA people - move from divisi general affair to specific GA sub-units
  //    DERRY, GAZALI, HELLY, HENDAR, RAHMAT → GA - Support
  //    RIZAL → GA - Support  
  //    YUSUF → GA - Technician
  const gaGeneralId = await getUnitId('divisi general affair');
  
  const gaSupport = ['derry', 'gazali', 'helly', 'taufan', 'rahmat', 'rizal'];
  for (const u of gaSupport) {
    await move(u, gaGeneralId, gaSupId);
  }
  console.log('✅ GA Support people → GA - Support');

  await move('yusuf', gaGeneralId, gaTechId);
  console.log('✅ YUSUF AHMAD → GA - Technician');

  // 6. Warehouse people - move from divisi Warehouse to GA - Warehouse / GA - Warehouse Manager
  //    ALDI, DENI, EGI, ERNAWAN, FAJAR, HAFIZH, IRHAM, RIDA → GA - Warehouse
  //    YANUAR → GA - Warehouse Manager
  const warehouseStaff = ['aldi', 'deni', 'egi', 'ernawan', 'fajar', 'hafizh', 'irham', 'rida'];
  for (const u of warehouseStaff) {
    await move(u, divWrhId, gaWrhId);
  }
  console.log('✅ Warehouse staff → GA - Warehouse');

  await move('yanuar', divWrhId, gaWrhMgrId);
  console.log('✅ YANUAR → GA - Warehouse Manager');

  // 7. KURNIA ADHINUGRAHA → job_position = Production Manager
  //    Currently in divisi Production - move to Production Manager
  await move('kurnia', divProdId, prodMgrId);
  console.log('✅ KURNIA ADHINUGRAHA → Production Manager');

  // 8. HAMDAN BUSYAIRI → job_position = Finance - Accounting Manager
  //    Currently in divisi finance - move to Finance - Accounting Manager
  await move('hamdan', divFinanceId, finAccMgrId);
  console.log('✅ HAMDAN BUSYAIRI → Finance - Accounting Manager');

  // 9. Myklon Marketing people → should be in MYKLON, not divisi marketing
  //    AKHMAD GUNAWAN, ALIFIA NABILA, SITI MAULINA have job_position = Myklon - Marketing
  await move('akhmad', mklnMktgId, myklonId);
  await move('alifia', mklnMktgId, myklonId);
  await move('siti', mklnMktgId, myklonId);
  console.log('✅ Myklon Marketing people → MYKLON');

  // 10. MUHAMAD APRIJAL HUSAINI → job_position = Myklon - RND, stays in MYKLON ✅

  // 11. apt. IVANA → Product Development Manager, stays there ✅

  // 12. R WIEKE → General Manager, stays in Factory General Manager ✅

  // 13. Beautylatory people - they have job_position = Beautylatory
  //     Currently in BEAUTYLATORY Store - that's fine, but let's also check if they should be in produk
  //     For now keep them in BEAUTYLATORY Store

  // Final stats
  console.log('\n─── Final Statistics ───\n');
  const [stats] = await c.execute(`
    SELECT ou.unit_name, COUNT(ous.username) as cnt
    FROM organizational_units ou
    LEFT JOIN org_unit_staff ous ON ous.org_unit_id = ou.id
    GROUP BY ou.id
    HAVING cnt > 0
    ORDER BY cnt DESC
  `);
  stats.forEach(s => console.log(`  ${s.unit_name}: ${s.cnt}`));

  console.log('\n✅ All assignments fixed!\n');
  await c.end();
})();
