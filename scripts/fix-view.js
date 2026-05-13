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

  await c.execute('DROP VIEW IF EXISTS v_org_hierarchy');

  await c.execute(`
    CREATE VIEW v_org_hierarchy AS
    SELECT 
      ou.id, ou.unit_code, ou.unit_name, ou.unit_type,
      ou.parent_id, ou.level, ou.path, ou.sort_order,
      ou.owner_username, ou.direksi_username, ou.manager_username,
      ou.description, ou.color, ou.icon, ou.is_active,
      ou.created_at, ou.updated_at, ou.created_by,
      owner.full_name AS owner_name, owner.avatar AS owner_avatar,
      dir.full_name AS direksi_name, dir.avatar AS direksi_avatar,
      mgr.full_name AS manager_name, mgr.avatar AS manager_avatar,
      COUNT(DISTINCT ous.username) AS member_count,
      COUNT(DISTINCT p.project_id) AS project_count,
      COUNT(DISTINCT t.task_id) AS task_count
    FROM organizational_units ou
    LEFT JOIN users owner ON owner.username = ou.owner_username
    LEFT JOIN users dir ON dir.username = ou.direksi_username
    LEFT JOIN users mgr ON mgr.username = ou.manager_username
    LEFT JOIN org_unit_staff ous ON ous.org_unit_id = ou.id
    LEFT JOIN projects p ON p.org_unit_id = ou.id
    LEFT JOIN tasks t ON t.org_unit_id = ou.id
    GROUP BY ou.id
  `);

  console.log('✅ v_org_hierarchy updated to use org_unit_staff!\n');

  // Verify member counts
  const [counts] = await c.execute(`
    SELECT unit_name, member_count 
    FROM v_org_hierarchy 
    WHERE member_count > 0 
    ORDER BY member_count DESC
  `);
  
  console.log('Units with members:');
  counts.forEach(r => console.log(`  ${r.unit_name}: ${r.member_count} members`));

  await c.end();
})();
