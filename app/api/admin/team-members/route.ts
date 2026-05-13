import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

async function resolveCompanyNameFromPath(path?: string | null, fallbackOrganization?: string | null, workspaceId?: string | null) {
  const fallbackCompany = await query<any[]>(workspaceId ? `
    SELECT unit_name
    FROM organizational_units
    WHERE unit_type = 'company' AND is_active = 1 AND workspace_id = ?
    ORDER BY level ASC, id ASC
    LIMIT 1
  ` : `
    SELECT unit_name
    FROM organizational_units
    WHERE unit_type = 'company' AND is_active = 1
    ORDER BY level ASC, id ASC
    LIMIT 1
  `, workspaceId ? [workspaceId] : []);

  const fallbackName = fallbackOrganization || fallbackCompany[0]?.unit_name || 'Unknown Company';
  const pathParts = String(path || '').split('/').filter((part) => part.trim() !== '');
  if (pathParts.length === 0) return fallbackName;

  const placeholders = pathParts.map(() => '?').join(',');
  const pathUnits = await query<any[]>(workspaceId ? `
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
      AND workspace_id = ?
      AND (unit_code IN (${placeholders}) OR id IN (${placeholders}))
  ` : `
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
      AND (unit_code IN (${placeholders}) OR id IN (${placeholders}))
  `, workspaceId ? [workspaceId, ...pathParts, ...pathParts] : [...pathParts, ...pathParts]);

  const byCode = new Map(pathUnits.map((unit) => [String(unit.unit_code), unit]));
  const byId = new Map(pathUnits.map((unit) => [String(unit.id), unit]));
  const orderedUnits = pathParts
    .map((part) => byCode.get(part) || byId.get(part))
    .filter(Boolean);

  const higherLevelCompany = [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) > 0);
  if (higherLevelCompany) return higherLevelCompany.unit_name;

  const rootCompany = [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) === 0);
  if (rootCompany && fallbackOrganization) return fallbackOrganization;

  return rootCompany?.unit_name || fallbackName;
}

// Ensure org_unit_staff table exists (multi-membership support)
async function ensureTable() {
  try {
    // Check if table exists and has correct structure
    await query('SELECT 1 FROM org_unit_staff LIMIT 1');
    
    // Update role enum to include all new roles including support and add is_primary flag
    await query(`
      ALTER TABLE org_unit_staff 
      MODIFY COLUMN role ENUM('staff', 'support', 'leader', 'manager', 'owner', 'direktur') DEFAULT 'staff'
    `);
    
    // Add is_primary column if it doesn't exist
    try {
      await query(`
        ALTER TABLE org_unit_staff 
        ADD COLUMN is_primary BOOLEAN DEFAULT FALSE
      `);
    } catch (e) {
      // Column might already exist
    }
    
    console.log('[team-members] Table structure updated with support role and primary flag');
  } catch (error) {
    console.log('[team-members] Creating table with updated structure');
    await query(`
      CREATE TABLE IF NOT EXISTS org_unit_staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        org_unit_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        role ENUM('staff', 'support', 'leader', 'manager', 'owner', 'direktur') DEFAULT 'staff',
        is_primary BOOLEAN DEFAULT FALSE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by VARCHAR(50),
        UNIQUE KEY unique_assignment (org_unit_id, username),
        INDEX idx_org_unit (org_unit_id),
        INDEX idx_username (username),
        INDEX idx_role (role),
        INDEX idx_primary (is_primary)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const workspaceContext = await getRequestWorkspaceContext(req);

  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const orgUnitId = searchParams.get('org_unit_id');

    if (orgUnitId) {
      console.log(`[team-members API] Loading members for unit ID: ${orgUnitId}`);
      
      const members = await query<any[]>(workspaceContext.activeWorkspace?.workspace_id ? `
        SELECT 
          ous.id,
          ous.username,
          ous.role as team_role,
          ous.assigned_at,
          u.full_name,
          u.avatar,
          u.job_position,
          u.email
        FROM org_unit_staff ous
        JOIN users u ON ous.username = u.username
        JOIN organizational_units ou ON ous.org_unit_id = ou.id
        WHERE ous.org_unit_id = ? AND u.is_active = 1 AND ou.workspace_id = ?
        ORDER BY u.full_name ASC
      ` : `
        SELECT 
          ous.id,
          ous.username,
          ous.role as team_role,
          ous.assigned_at,
          u.full_name,
          u.avatar,
          u.job_position,
          u.email
        FROM org_unit_staff ous
        JOIN users u ON ous.username = u.username
        WHERE ous.org_unit_id = ? AND u.is_active = 1
        ORDER BY u.full_name ASC
      `, workspaceContext.activeWorkspace?.workspace_id ? [orgUnitId, workspaceContext.activeWorkspace.workspace_id] : [orgUnitId]);

      console.log(`[team-members API] Found ${members.length} members for unit ${orgUnitId}`);
      console.log(`[team-members API] Members:`, members.map(m => `${m.full_name} (${m.username})`));

      return NextResponse.json({ success: true, members });
    }

    // All visible employees in the active workspace; fallback to active users only if workspace is unavailable
    const employees = workspaceContext.activeWorkspace
      ? await query<any[]>(`
          SELECT DISTINCT
            u.username, u.full_name, u.avatar, u.job_position, u.email
          FROM workspace_members wm
          JOIN users u ON u.username = wm.username
          WHERE wm.workspace_id = ? AND u.is_active = 1
          ORDER BY u.full_name ASC, u.username ASC
        `, [workspaceContext.activeWorkspace.workspace_id])
      : await query<any[]>(`
          SELECT username, full_name, avatar, job_position, email
          FROM users WHERE is_active = 1
          ORDER BY full_name ASC
        `);
    return NextResponse.json({ success: true, employees });
  } catch (e: any) {
    console.error('[team-members GET]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Helper function to update user's primary job position and organization
async function updateUserPrimaryInfo(username: string) {
  try {
    // Get primary assignment with unit details
    const primaryAssignment = await query(`
      SELECT 
        ous.org_unit_id,
        ou.unit_name,
        ou.unit_type,
        ou.path,
        ou.level,
        ou.workspace_id,
        u.organization as current_organization
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      JOIN users u ON u.username = ous.username
      WHERE ous.username = ? AND ous.is_primary = TRUE AND ou.is_active = 1
      LIMIT 1
    `, [username]);

    if ((primaryAssignment as any[]).length === 0) {
      console.log(`[updateUserPrimaryInfo] No primary assignment found for ${username}`);
      return;
    }

    const assignment = (primaryAssignment as any[])[0];
    console.log(`[updateUserPrimaryInfo] Primary assignment for ${username}: unit=${assignment.unit_name}, path=${assignment.path}`);
    
    const companyName = await resolveCompanyNameFromPath(assignment.path, assignment.current_organization, assignment.workspace_id);
    console.log(`[updateUserPrimaryInfo] Resolved company for ${username}: ${companyName}`);

    // Update user's job_position and organization
    await query(`
      UPDATE users 
      SET 
        job_position = ?,
        organization = ?
      WHERE username = ?
    `, [assignment.unit_name, companyName, username]);

    console.log(`[updateUserPrimaryInfo] ✅ Updated ${username}: job_position="${assignment.unit_name}", organization="${companyName}"`);
  } catch (error) {
    console.error('[updateUserPrimaryInfo] Error:', error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;

  try {
    await ensureTable();
    const body = await req.json();
    const { org_unit_id, username, role = 'staff', is_primary = false } = body;

    if (!org_unit_id || !username) {
      return NextResponse.json({ success: false, error: 'org_unit_id and username required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['staff', 'support', 'leader', 'manager', 'owner', 'direktur'];
    if (!validRoles.includes(role.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Invalid role. Must be: staff, support, leader, manager, owner, or direktur' }, { status: 400 });
    }

    // Check if user exists
    const userExists = await query('SELECT username FROM users WHERE username = ? AND is_active = 1', [username]);
    if ((userExists as any[]).length === 0) {
      return NextResponse.json({ success: false, error: 'User not found or inactive' }, { status: 404 });
    }

    // Check if organizational unit exists
    const unitExists = workspaceContext.activeWorkspace?.workspace_id
      ? await query('SELECT id FROM organizational_units WHERE id = ? AND workspace_id = ? AND is_active = 1', [org_unit_id, workspaceContext.activeWorkspace.workspace_id])
      : await query('SELECT id FROM organizational_units WHERE id = ? AND is_active = 1', [org_unit_id]);
    if ((unitExists as any[]).length === 0) {
      return NextResponse.json({ success: false, error: 'Organizational unit not found or inactive' }, { status: 404 });
    }

    // If this is set as primary, remove primary flag from other assignments
    if (is_primary) {
      await query('UPDATE org_unit_staff SET is_primary = FALSE WHERE username = ?', [username]);
    }

    // Upsert - insert or update if already exists
    await query(`
      INSERT INTO org_unit_staff (org_unit_id, username, role, is_primary, assigned_by, assigned_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        role = VALUES(role),
        is_primary = VALUES(is_primary),
        assigned_by = VALUES(assigned_by),
        assigned_at = CURRENT_TIMESTAMP
    `, [org_unit_id, username, role.toLowerCase(), is_primary, adminUser.username]);

    // If this is primary assignment, update user's job_position and organization
    if (is_primary) {
      await updateUserPrimaryInfo(username);
    }

    console.log(`[team-members POST] Assigned ${username} as ${role} to unit ${org_unit_id}${is_primary ? ' (PRIMARY)' : ''}`);
    return NextResponse.json({ success: true, message: `Successfully assigned as ${role}${is_primary ? ' (Primary)' : ''}` });
  } catch (e: any) {
    console.error('[team-members POST]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;

  try {
    await ensureTable();
    const { org_unit_id, username, role, is_primary } = await req.json();

    if (!org_unit_id || !username || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields: org_unit_id, username, role' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['staff', 'support', 'leader', 'manager', 'owner', 'direktur'];
    if (!validRoles.includes(role.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Invalid role. Must be: staff, support, leader, manager, owner, or direktur' }, { status: 400 });
    }

    // If this is set as primary, remove primary flag from other assignments
    if (is_primary) {
      await query('UPDATE org_unit_staff SET is_primary = FALSE WHERE username = ?', [username]);
    }

    // Update the role and primary flag for this specific assignment
    const result = await query(
      'UPDATE org_unit_staff SET role = ?, is_primary = ?, assigned_at = CURRENT_TIMESTAMP WHERE org_unit_id = ? AND username = ?',
      [role.toLowerCase(), is_primary || false, org_unit_id, username]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    // If this is primary assignment, update user's job_position and organization
    if (is_primary) {
      await updateUserPrimaryInfo(username);
    }

    console.log(`[team-members PUT] Updated ${username} role to ${role} in unit ${org_unit_id}${is_primary ? ' (PRIMARY)' : ''}`);
    return NextResponse.json({ success: true, message: `Role updated to ${role}${is_primary ? ' (Primary)' : ''}` });
  } catch (e: any) {
    console.error('[team-members PUT]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const orgUnitId = searchParams.get('org_unit_id');
    const username = searchParams.get('username');

    if (!orgUnitId || !username) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
    }

    await query(
      'DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?',
      [orgUnitId, username]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
