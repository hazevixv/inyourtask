import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * GET /api/admin/roles
 * Returns role names from user_roles table + agent-role assignments
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  const memberUsernames = workspaceContext.memberUsernames.length > 0
    ? workspaceContext.memberUsernames
    : (user?.username ? [user.username] : []);

  let assignments: any[] = [];

  if (activeWorkspaceId) {
    assignments = await query<any[]>(`
      SELECT ara.agent_id, ara.role_name, ara.assigned_by, ara.created_at,
             a.name as agent_name, a.role as agent_role, a.avatar
      FROM agent_role_assignments ara
      JOIN ai_agents a ON a.agent_id = ara.agent_id
      ORDER BY ara.role_name, a.name
    `);
  }

  const roleNames = Array.from(new Set(assignments.map((a: any) => a.role_name).filter(Boolean)));

  return NextResponse.json({
    success: true,
    positions: roleNames,
    assignments,
    roleCounts: roleNames.map((name) => ({ job_position: name, user_count: 0 }))
  });
}

/**
 * POST /api/admin/roles
 * Assign an agent to a role
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

  const { agent_id, role_name } = await req.json();
  if (!agent_id || !role_name) {
    return NextResponse.json({ success: false, error: 'agent_id and role_name required' }, { status: 400 });
  }

  if (!isSuperAdmin && activeWorkspaceId) {
    const memberPlaceholders = memberUsernames.map(() => '?').join(',');
    const agentVisible = await query<any[]>(`
      SELECT 1
      FROM ai_agents
      WHERE agent_id = ?
        AND (
          owner_username IN (${memberPlaceholders})
          OR created_by IN (${memberPlaceholders})
        )
      LIMIT 1
    `, [agent_id, ...memberUsernames, ...memberUsernames]);
    if (agentVisible.length === 0) {
      return NextResponse.json({ success: false, error: 'Agent is not part of the active workspace' }, { status: 403 });
    }
  }

  await query(
    'INSERT IGNORE INTO agent_role_assignments (agent_id, role_name, assigned_by) VALUES (?, ?, ?)',
    [agent_id, role_name, adminUser.username]
  );

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/roles
 * Remove agent from role
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  const memberUsernames = workspaceContext.memberUsernames.length > 0
    ? workspaceContext.memberUsernames
    : (user?.username ? [user.username] : []);

  const { searchParams } = new URL(req.url);
  const agent_id = searchParams.get('agent_id');
  const role_name = searchParams.get('role_name');

  if (!agent_id || !role_name) {
    return NextResponse.json({ success: false, error: 'agent_id and role_name required' }, { status: 400 });
  }

  if (!isSuperAdmin && activeWorkspaceId) {
    const memberPlaceholders = memberUsernames.map(() => '?').join(',');
    const agentVisible = await query<any[]>(`
      SELECT 1
      FROM ai_agents
      WHERE agent_id = ?
        AND (
          owner_username IN (${memberPlaceholders})
          OR created_by IN (${memberPlaceholders})
        )
      LIMIT 1
    `, [agent_id, ...memberUsernames, ...memberUsernames]);
    if (agentVisible.length === 0) {
      return NextResponse.json({ success: false, error: 'Agent is not part of the active workspace' }, { status: 403 });
    }
  }

  await query(
    'DELETE FROM agent_role_assignments WHERE agent_id = ? AND role_name = ?',
    [agent_id, role_name]
  );

  return NextResponse.json({ success: true });
}
