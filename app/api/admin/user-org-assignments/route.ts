import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * GET /api/admin/user-org-assignments?username=xxx
 * Get all organizational unit assignments for a specific user
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ success: false, error: 'username required' }, { status: 400 });
  }

  try {
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    // Get all organizational assignments for this user with unit details
    const assignments = activeWorkspaceId ? await query<any[]>(`
      SELECT 
        ous.id,
        ous.org_unit_id,
        ous.username,
        ous.role,
        ous.is_primary,
        ous.assigned_at,
        ous.assigned_by,
        ou.unit_name,
        ou.unit_code,
        ou.unit_type,
        ou.color,
        ou.icon,
        ou.level,
        ou.path
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1 AND ou.workspace_id = ?
      ORDER BY ous.is_primary DESC, ou.level ASC, ou.unit_name ASC
    `, [username, activeWorkspaceId]) : [];

    // Also get team members for each unit this user is in
    const assignmentsWithTeam = await Promise.all(
      assignments.map(async (assignment) => {
        const teamMembers = await query<any[]>(`
          SELECT 
            ous.username,
            ous.role as team_role,
            u.full_name,
            u.avatar,
            u.job_position
          FROM org_unit_staff ous
          JOIN users u ON ous.username = u.username
          JOIN organizational_units ou ON ou.id = ous.org_unit_id
          WHERE ous.org_unit_id = ? AND u.is_active = 1 AND ous.username != ? AND ou.workspace_id = ?
          ORDER BY 
            CASE ous.role 
              WHEN 'owner' THEN 1
              WHEN 'direktur' THEN 2  
              WHEN 'manager' THEN 3
              WHEN 'leader' THEN 4
              WHEN 'staff' THEN 5
              ELSE 6
            END,
            u.full_name ASC
          LIMIT 10
        `, [assignment.org_unit_id, username, activeWorkspaceId]);

        return {
          ...assignment,
          team_members: teamMembers,
          team_count: teamMembers.length
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      assignments: assignmentsWithTeam 
    });
  } catch (e: any) {
    console.error('[user-org-assignments GET]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
