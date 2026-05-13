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

function tokenize(value) {
  return normalize(value).split(' ').filter(Boolean);
}

function scoreMatch(user, unit) {
  const job = normalize(user.job_position);
  const org = normalize(user.organization);
  const unitName = normalize(unit.unit_name);
  const unitCode = normalize(unit.unit_code);
  const unitTokens = tokenize(unit.unit_name);
  const codeTokens = tokenize(unit.unit_code);
  let score = 0;
  let reason = '';

  if (job && job === unitName) return { score: 100, reason: 'Exact job position match' };
  if (job && unitCode && job === unitCode) return { score: 100, reason: 'Exact unit code match' };
  if (org && org === unitName) return { score: 95, reason: 'Exact organization match' };

  if (job && unitName && job.includes(unitName) && unitName.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 88 : 78);
    reason = 'Job position contains unit name';
  }

  if (org && unitName && org.includes(unitName) && unitName.length >= 4) {
    score = Math.max(score, unit.unit_type === 'company' ? 84 : 72);
    reason = reason || 'Organization contains unit name';
  }

  if (job && unitCode && job.includes(unitCode) && unitCode.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 96 : unit.level >= 2 ? 94 : 80);
    reason = reason || 'Job position contains unit code';
  }

  if (unitCode && job && unitCode.includes(job) && job.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 97 : unit.level >= 2 ? 93 : 78);
    reason = reason || 'Unit code contains job position';
  }

  const overlapJob = unitTokens.filter((token) => token.length >= 4 && job.includes(token)).length;
  const overlapOrg = unitTokens.filter((token) => token.length >= 4 && org.includes(token)).length;
  const overlapCode = codeTokens.filter((token) => token.length >= 4 && (job.includes(token) || org.includes(token))).length;
  const overlap = Math.max(overlapJob, overlapOrg, overlapCode);
  if (overlap >= 2) {
    score = Math.max(score, 72 + overlap * 6 + (unit.level >= 2 ? 4 : 0));
    reason = reason || 'Multiple token overlap';
  } else if (overlap >= 1 && !reason) {
    score = Math.max(score, unit.level >= 2 ? 74 : 62);
    reason = 'Single token overlap';
  }

  if (unit.level === 0) score = Math.min(score, 70);

  return { score, reason };
}

async function resolveCompanyNameFromPath(conn, path, fallbackOrganization) {
  const [fallbackCompany] = await conn.query(`
    SELECT unit_name
    FROM organizational_units
    WHERE unit_type = 'company' AND is_active = 1
    ORDER BY level ASC, id ASC
    LIMIT 1
  `);

  const fallbackName = fallbackOrganization || fallbackCompany[0]?.unit_name || 'Unknown Company';
  const pathParts = String(path || '').split('/').filter((part) => part.trim() !== '');
  if (pathParts.length === 0) return fallbackName;

  const placeholders = pathParts.map(() => '?').join(',');
  const [pathUnits] = await conn.query(`
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
      AND (unit_code IN (${placeholders}) OR id IN (${placeholders}))
  `, [...pathParts, ...pathParts]);

  const byCode = new Map(pathUnits.map((unit) => [String(unit.unit_code), unit]));
  const byId = new Map(pathUnits.map((unit) => [String(unit.id), unit]));
  const orderedUnits = pathParts.map((part) => byCode.get(part) || byId.get(part)).filter(Boolean);
  const companyUnit = [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) > 0)
    || [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) === 0);
  return companyUnit?.unit_name || fallbackName;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [users] = await conn.query(`
    SELECT username, full_name, job_position, organization
    FROM users
    WHERE is_active = 1
    ORDER BY full_name ASC
  `);

  const [units] = await conn.query(`
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
    ORDER BY level ASC, unit_name ASC
  `);

  const [assignedRows] = await conn.query('SELECT username FROM org_unit_staff');
  const assignedSet = new Set(assignedRows.map((row) => String(row.username)));

  const candidates = [];
  for (const user of users) {
    if (assignedSet.has(user.username)) continue;
    const ranked = units
      .map((unit) => ({ unit, ...scoreMatch(user, unit) }))
      .filter((item) => item.score >= 90)
      .sort((a, b) => b.score - a.score || a.unit.level - b.unit.level || a.unit.unit_name.localeCompare(b.unit.unit_name));
    if (ranked.length > 0) {
      candidates.push({ user, candidate: ranked[0] });
    }
  }

  let applied = 0;
  for (const { user, candidate } of candidates) {
    await conn.query('UPDATE org_unit_staff SET is_primary = FALSE WHERE username = ?', [user.username]);
    await conn.query(
      `INSERT INTO org_unit_staff (org_unit_id, username, role, is_primary, assigned_by, assigned_at)
       VALUES (?, ?, 'staff', TRUE, NULL, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         is_primary = VALUES(is_primary),
         assigned_by = VALUES(assigned_by),
         assigned_at = CURRENT_TIMESTAMP`,
      [candidate.unit.id, user.username]
    );
    applied++;
  }

  const [primaryAssignments] = await conn.query(`
    SELECT ous.username, ous.org_unit_id, ou.unit_name, ou.path, u.organization as current_organization
    FROM org_unit_staff ous
    JOIN organizational_units ou ON ous.org_unit_id = ou.id
    JOIN users u ON u.username = ous.username
    WHERE ous.is_primary = TRUE AND ou.is_active = 1
  `);

  let synced = 0;
  for (const assignment of primaryAssignments) {
    const companyName = await resolveCompanyNameFromPath(conn, assignment.path, assignment.current_organization);
    await conn.query(
      'UPDATE users SET job_position = ?, organization = ? WHERE username = ?',
      [assignment.unit_name, companyName, assignment.username]
    );
    await conn.query(
      'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, NULL)',
      [assignment.username, assignment.unit_name]
    );
    synced++;
  }

  console.log(JSON.stringify({
    applied,
    synced,
    total_candidates: candidates.length
  }, null, 2));

  await conn.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
