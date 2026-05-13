const mysql = require('mysql2/promise');
require('dotenv').config();

function slugify(text) {
  return String(text || 'workspace')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'workspace';
}

function workspaceRoleFromUser(user) {
  const role = String(user.role || '').toLowerCase();
  const hierarchy = String(user.hierarchy_level || '').toLowerCase();
  if (role === 'admin' || hierarchy === 'owner') return 'owner';
  if (hierarchy === 'direksi') return 'admin';
  if (hierarchy === 'manager') return 'manager';
  return 'member';
}

async function ensureTables(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id VARCHAR(20) NOT NULL UNIQUE,
      slug VARCHAR(120) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      type ENUM('personal','team','company') NOT NULL DEFAULT 'team',
      owner_username VARCHAR(50) NULL,
      created_by VARCHAR(50) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_owner_username (owner_username),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id VARCHAR(20) NOT NULL,
      username VARCHAR(50) NOT NULL,
      role ENUM('owner','admin','manager','member','guest') NOT NULL DEFAULT 'member',
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      joined_by VARCHAR(50) NULL,
      UNIQUE KEY unique_workspace_member (workspace_id, username),
      INDEX idx_workspace_id (workspace_id),
      INDEX idx_username (username),
      INDEX idx_role (role),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS workspace_invites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invite_code VARCHAR(80) NOT NULL UNIQUE,
      workspace_id VARCHAR(20) NOT NULL,
      email VARCHAR(100) NULL,
      role ENUM('owner','admin','manager','member','guest') NOT NULL DEFAULT 'member',
      invited_by VARCHAR(50) NOT NULL,
      expires_at DATETIME NULL,
      accepted_by VARCHAR(50) NULL,
      accepted_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_workspace_id (workspace_id),
      INDEX idx_invited_by (invited_by),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(username) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS workspace_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL UNIQUE,
      role_label VARCHAR(100) NOT NULL,
      role_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function seedRoles(connection) {
  const roles = [
    ['owner', 'Owner', 1],
    ['admin', 'Admin', 2],
    ['manager', 'Manager', 3],
    ['member', 'Member', 4],
    ['guest', 'Guest', 5],
  ];
  for (const [role_name, role_label, role_order] of roles) {
    await connection.execute(
      `INSERT IGNORE INTO workspace_roles (role_name, role_label, role_order) VALUES (?, ?, ?)`,
      [role_name, role_label, role_order]
    );
  }
}

async function createWorkspace(connection, { name, type, owner_username, created_by, slug }) {
  const baseSlug = slugify(slug || name);
  let nextSlug = baseSlug;
  let counter = 2;
  while (true) {
    const [existing] = await connection.execute('SELECT workspace_id FROM workspaces WHERE slug = ? LIMIT 1', [nextSlug]);
    if (existing.length === 0) break;
    nextSlug = `${baseSlug}-${counter++}`;
  }

  const [last] = await connection.execute(`SELECT workspace_id FROM workspaces WHERE workspace_id LIKE 'WS-%' ORDER BY CAST(SUBSTRING(workspace_id, 4) AS UNSIGNED) DESC LIMIT 1`);
  const currentMax = last[0]?.workspace_id ? Number(last[0].workspace_id.replace('WS-', '')) : 0;
  const workspaceId = `WS-${String(currentMax + 1).padStart(3, '0')}`;

  await connection.execute(`
    INSERT INTO workspaces (workspace_id, slug, name, type, owner_username, created_by, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `, [workspaceId, nextSlug, name, type, owner_username, created_by]);

  return workspaceId;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    multipleStatements: true,
  });

  try {
    console.log('Setting up workspace system...');
    await ensureTables(connection);
    await seedRoles(connection);

    const [workspaceCount] = await connection.execute('SELECT COUNT(*) AS cnt FROM workspaces');
    const [memberCount] = await connection.execute('SELECT COUNT(*) AS cnt FROM workspace_members');
    console.log('Workspace system setup complete.');
    console.log(`Workspaces: ${workspaceCount[0].cnt}`);
    console.log(`Workspace members: ${memberCount[0].cnt}`);
  } catch (error) {
    console.error('Workspace setup failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
