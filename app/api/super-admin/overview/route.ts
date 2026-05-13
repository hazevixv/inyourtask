import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { query } from '@/lib/db';

async function safeCount(sql: string) {
  try {
    const rows = await query<Array<{ cnt: number }>>(sql);
    return Number(rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;

  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const [
      userCount,
      activeUserCount,
      workspaceCount,
      memberCount,
      inviteCount,
      projectCount,
      taskCount,
      agentCount,
      workerAgentCount,
      personalAgentCount,
      conversationCount,
      configCount,
      roleAssignmentCount,
      organizationUnitCount,
      teamMemberCount,
      recentUsers,
      workspaces,
    ] = await Promise.all([
      safeCount('SELECT COUNT(*) AS cnt FROM users'),
      safeCount('SELECT COUNT(*) AS cnt FROM users WHERE is_active = 1'),
      safeCount('SELECT COUNT(*) AS cnt FROM workspaces'),
      safeCount('SELECT COUNT(*) AS cnt FROM workspace_members'),
      safeCount('SELECT COUNT(*) AS cnt FROM workspace_invites'),
      safeCount('SELECT COUNT(*) AS cnt FROM projects'),
      safeCount('SELECT COUNT(*) AS cnt FROM tasks'),
      safeCount('SELECT COUNT(*) AS cnt FROM ai_agents'),
      safeCount("SELECT COUNT(*) AS cnt FROM ai_agents WHERE is_personal = 0"),
      safeCount("SELECT COUNT(*) AS cnt FROM ai_agents WHERE is_personal = 1"),
      safeCount('SELECT COUNT(*) AS cnt FROM chat_conversations'),
      safeCount('SELECT COUNT(*) AS cnt FROM brain_config'),
      safeCount('SELECT COUNT(*) AS cnt FROM agent_role_assignments'),
      safeCount('SELECT COUNT(*) AS cnt FROM organizational_units'),
      safeCount('SELECT COUNT(*) AS cnt FROM team_members'),
      query<any[]>(`
        SELECT username, full_name, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 20
      `),
      query<any[]>(`
        SELECT w.workspace_id, w.name, w.type, w.owner_username, w.is_active, w.created_at,
          (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.workspace_id) AS member_count,
          (SELECT COUNT(*) FROM projects p WHERE p.workspace_id = w.workspace_id) AS project_count
        FROM workspaces w
        ORDER BY w.created_at DESC
        LIMIT 20
      `),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          users: userCount,
          activeUsers: activeUserCount,
          workspaces: workspaceCount,
          workspaceMembers: memberCount,
          invites: inviteCount,
          projects: projectCount,
          tasks: taskCount,
          agents: agentCount,
          workerAgents: workerAgentCount,
          personalAgents: personalAgentCount,
          conversations: conversationCount,
          brainConfigs: configCount,
          agentRoleAssignments: roleAssignmentCount,
          organizationalUnits: organizationUnitCount,
          teamMembers: teamMemberCount,
        },
        recentUsers,
        workspaces,
      }
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load super admin overview' }, { status: 500 });
  }
}
