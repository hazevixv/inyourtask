const mysql = require('mysql2/promise');
require('dotenv').config();

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, terms) {
  const value = normalize(text);
  return terms.some((term) => value.includes(term));
}

async function ensureUnit(conn, { unitCode, unitName, unitType, parentCode, color = '#7c3aed', icon = 'building' }) {
  const [existing] = await conn.query('SELECT id, path, level FROM organizational_units WHERE unit_code = ? LIMIT 1', [unitCode]);
  if (existing.length > 0) return existing[0];

  const [parentRows] = await conn.query('SELECT id, path, level FROM organizational_units WHERE unit_code = ? LIMIT 1', [parentCode]);
  if (parentRows.length === 0) throw new Error(`Parent unit not found: ${parentCode}`);

  const parent = parentRows[0];
  const path = `${parent.path}/${unitCode}`;
  const level = Number(parent.level) + 1;

  const [result] = await conn.query(
    `INSERT INTO organizational_units
     (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 999, ?, ?, 1)`,
    [unitCode, unitName, unitType, parent.id, level, path, color, icon]
  );

  const [created] = await conn.query('SELECT id, path, level FROM organizational_units WHERE id = ?', [result.insertId]);
  return created[0];
}

function pickUnitCode(user) {
  const job = normalize(user.job_position);
  const org = normalize(user.organization);

  if (!job && !org) return null;

  if (org.includes('labcos')) {
    if (job.includes('research and development') || job.includes('r and d') || job.includes('rnd')) return 'MANAGER_LABCOS';
  }

  if (org.includes('apotek')) {
    if (job.includes('apoteker')) return 'APOTEK_PARAHYANGAN_SUITE';
  }

  if (org.includes('rayandra')) {
    if (job.includes('direktur') || job.includes('pa - pak wendra')) return 'DIREKTUR_OFFICE';
    if (job.includes('business development')) return 'DIVISI_MARKETING_SALES';
    if (job.includes('finance')) return 'DIVISI_FINANCE';
    if (job.includes('administration')) return 'DIVISI_ADMINISTRATIVE_OFFICE';
    if (job.includes('ga - support')) return 'DIVISI_GENERAL_AFFAIR_OFFICE';
  }

  if (org.includes('lunaray')) {
    if (job.includes('research and development') || job.includes('product development')) return 'DIVISI_RESEARCH_DEVELOPMENT_MFG';
    if (job.includes('production')) return 'DIVISI_PRODUCTION';
    if (job.includes('finance')) return 'DIVISI_FINANCE';
    if (job.includes('administration') || job.includes('human resources') || job.includes('it support')) return 'DIVISI_ADMINISTRATIVE';
    if (job.includes('quality control') || job.includes('qa')) return 'DIVISI_PPIC';
    if (job.includes('general manager')) return 'DIVISI_GENERAL_AFFAIR';
    if (job.includes('ga - warehouse') || job.includes('warehouse') || job.includes('ga - technician') || job.includes('ga - support')) return 'DIVISI_GENERAL_AFFAIR';
    if (job.includes('business development')) return 'DIVISI_MARKETING_SALES_MFG';
  }

  if (job.includes('creative')) return 'DIVISI_CREATIVE';
  if (job.includes('media')) return 'DIVISI_SOCIAL_MEDIA';
  if (job.includes('finance')) return 'DIVISI_FINANCE';
  if (job.includes('administration')) return 'DIVISI_ADMINISTRATIVE';
  if (job.includes('business development')) return 'DIVISI_MARKETING_SALES';
  if (job.includes('quality control') || job.includes('qa')) return 'DIVISI_PPIC';
  if (job.includes('production')) return 'DIVISI_PRODUCTION';
  if (job.includes('research and development')) return 'DIVISI_RESEARCH_DEVELOPMENT';
  if (job.includes('warehouse') || job.includes('support') || job.includes('technician') || job.includes('general manager')) return 'OFFICE';

  return null;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await ensureUnit(conn, {
    unitCode: 'DIVISI_ADMINISTRATIVE_OFFICE',
    unitName: 'Divisi Administrative (Office)',
    unitType: 'department',
    parentCode: 'OFFICE',
    icon: 'clipboard-list'
  });

  await ensureUnit(conn, {
    unitCode: 'DIVISI_GENERAL_AFFAIR_OFFICE',
    unitName: 'Divisi General Affair (Office)',
    unitType: 'department',
    parentCode: 'OFFICE',
    icon: 'shield'
  });

  await ensureUnit(conn, {
    unitCode: 'APOTEK_PARAHYANGAN_SUITE',
    unitName: 'Apotek Parahyangan Suite',
    unitType: 'product',
    parentCode: 'UNIT_BISNIS',
    icon: 'pill'
  });

  const [users] = await conn.query(`
    SELECT username, full_name, job_position, organization
    FROM users
    WHERE is_active = 1
    ORDER BY full_name ASC
  `);

  let assigned = 0;
  const skipped = [];

  for (const user of users) {
    const unitCode = pickUnitCode(user);
    if (!unitCode) {
      skipped.push(user.username);
      continue;
    }

    const [units] = await conn.query('SELECT id FROM organizational_units WHERE unit_code = ? LIMIT 1', [unitCode]);
    if (units.length === 0) {
      skipped.push(user.username);
      continue;
    }

    const unitId = units[0].id;

    await conn.query('UPDATE org_unit_staff SET is_primary = FALSE WHERE username = ?', [user.username]);
    await conn.query(
      `INSERT INTO org_unit_staff (org_unit_id, username, role, is_primary, assigned_by, assigned_at)
       VALUES (?, ?, 'staff', TRUE, NULL, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         is_primary = VALUES(is_primary),
         assigned_by = VALUES(assigned_by),
         assigned_at = CURRENT_TIMESTAMP`,
      [unitId, user.username]
    );

    await conn.query(
      'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, NULL)',
      [user.username, user.job_position || unitCode]
    );

    assigned++;
  }

  const [remaining] = await conn.query(`
    SELECT COUNT(*) c
    FROM users u
    LEFT JOIN org_unit_staff ous ON ous.username = u.username AND ous.is_primary = 1
    WHERE u.is_active = 1 AND ous.username IS NULL
  `);

  console.log(JSON.stringify({
    assigned,
    remaining: remaining[0].c,
    skipped,
  }, null, 2));

  await conn.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
