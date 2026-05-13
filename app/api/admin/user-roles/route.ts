import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * GET /api/admin/user-roles?username=xxx
 * Get roles for a specific user (or all users)
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (username) {
    if (!isSuperAdmin && activeWorkspaceId) {
      const membership = await query<any[]>(
        'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND username = ? LIMIT 1',
        [activeWorkspaceId, username]
      );
      if (membership.length === 0) {
        return NextResponse.json({ success: false, error: 'User is not part of the active workspace' }, { status: 403 });
      }
    }
    const roles = await query<any[]>(
      'SELECT role_name, assigned_by, created_at FROM user_roles WHERE username = ? ORDER BY role_name',
      [username]
    );
    return NextResponse.json({ success: true, roles });
  }

  let roles: any[] = [];
  if (isSuperAdmin) {
    roles = await query<any[]>(`
      SELECT ur.username, ur.role_name, ur.assigned_by, ur.created_at,
             u.full_name, u.avatar, u.job_position
      FROM user_roles ur
      JOIN users u ON u.username = ur.username
      ORDER BY ur.username, ur.role_name
    `);
  } else if (activeWorkspaceId) {
    roles = await query<any[]>(`
      SELECT ur.username, ur.role_name, ur.assigned_by, ur.created_at,
             u.full_name, u.avatar, u.job_position
      FROM user_roles ur
      JOIN users u ON u.username = ur.username
      JOIN workspace_members wm ON wm.username = ur.username AND wm.workspace_id = ?
      ORDER BY ur.username, ur.role_name
    `, [activeWorkspaceId]);
  }

  return NextResponse.json({ success: true, roles });
}

/**
 * POST /api/admin/user-roles
 * Add a role to a user (supports multiple roles per user)
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;
  const isSuperAdmin = isPlatformSuperAdminUser(adminUser as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  const memberUsernames = workspaceContext.memberUsernames.length > 0
    ? workspaceContext.memberUsernames
    : (adminUser.username ? [adminUser.username] : []);

  const { username, role_name } = await req.json();
  if (!username || !role_name) {
    return NextResponse.json({ success: false, error: 'username and role_name required' }, { status: 400 });
  }

  if (!isSuperAdmin && activeWorkspaceId) {
    const memberCheck = await query<any[]>(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND username = ? LIMIT 1',
      [activeWorkspaceId, username]
    );
    if (memberCheck.length === 0) {
      return NextResponse.json({ success: false, error: 'User is not part of the active workspace' }, { status: 403 });
    }
  }

  await query(
    'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
    [username, role_name, adminUser.username]
  );

  return NextResponse.json({ success: true });
}

/**
 * PUT /api/admin/user-roles
 * Sync all users' job_position to user_roles table
 * Also supports bulk assign: { job_position, role_name } to add extra role to all users with that job_position
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;
  const isSuperAdmin = isPlatformSuperAdminUser(adminUser as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const body = await req.json();
  const { action } = body;

  if (action === 'sync_job_positions') {
    const users = isSuperAdmin || !activeWorkspaceId
      ? await query<any[]>(
          'SELECT username, job_position FROM users WHERE job_position IS NOT NULL AND job_position != \'\' AND is_active = 1'
        )
      : await query<any[]>(`
          SELECT u.username, u.job_position
          FROM workspace_members wm
          JOIN users u ON u.username = wm.username
          WHERE wm.workspace_id = ? AND u.job_position IS NOT NULL AND u.job_position != '' AND u.is_active = 1
        `, [activeWorkspaceId]);

    let synced = 0;
    for (const u of users) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [u.username, u.job_position, adminUser.username]
      );
      synced++;
    }

    return NextResponse.json({ success: true, synced, message: `Synced ${synced} users` });
  }

  if (action === 'bulk_assign') {
    // Assign an extra role to all users with a specific job_position
    const { job_position, role_name } = body;
    if (!job_position || !role_name) {
      return NextResponse.json({ success: false, error: 'job_position and role_name required' }, { status: 400 });
    }

    const users = isSuperAdmin || !activeWorkspaceId
      ? await query<any[]>(
          'SELECT username FROM users WHERE job_position = ? AND is_active = 1',
          [job_position]
        )
      : await query<any[]>(`
          SELECT u.username
          FROM workspace_members wm
          JOIN users u ON u.username = wm.username
          WHERE wm.workspace_id = ? AND u.job_position = ? AND u.is_active = 1
        `, [activeWorkspaceId, job_position]);

    let assigned = 0;
    for (const u of users) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [u.username, role_name, adminUser.username]
      );
      assigned++;
    }

    return NextResponse.json({ success: true, assigned, message: `Assigned role to ${assigned} users` });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

/**
 * DELETE /api/admin/user-roles
 * Remove a role from a user
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const role_name = searchParams.get('role_name');

  if (!username || !role_name) {
    return NextResponse.json({ success: false, error: 'username and role_name required' }, { status: 400 });
  }

  if (!isSuperAdmin && activeWorkspaceId) {
    const memberCheck = await query<any[]>(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND username = ? LIMIT 1',
      [activeWorkspaceId, username]
    );
    if (memberCheck.length === 0) {
      return NextResponse.json({ success: false, error: 'User is not part of the active workspace' }, { status: 403 });
    }
  }

  await query(
    'DELETE FROM user_roles WHERE username = ? AND role_name = ?',
    [username, role_name]
  );

  return NextResponse.json({ success: true });
}
