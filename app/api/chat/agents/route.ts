import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';

function dedupeAgents(list: any[]) {
  const map = new Map<string, any>();
  for (const agent of list) {
    if (!agent?.agent_id) continue;
    if (!map.has(agent.agent_id)) map.set(agent.agent_id, agent);
  }
  return Array.from(map.values());
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const canManageWorkspace = hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);

    const { searchParams } = new URL(req.url);
    const forSettings = searchParams.get('settings') === '1';

    // Get all available worker agents (public + assigned + role-based)
    const workerAgents = await ChatModel.getAvailableWorkerAgents(user.username, activeWorkspaceId);
    const fallbackWorkerAgents = await query<any[]>(
      `SELECT a.*,
        NULL AS assignment_id, NULL AS is_approved, NULL AS assigned_active,
        NULL AS assigned_access_type, NULL AS activation_code,
        sp.name AS plan_name,
        (SELECT COUNT(*) FROM agent_role_assignments ara WHERE ara.agent_id = a.agent_id) AS role_count
       FROM ai_agents a
       LEFT JOIN subscription_plans sp ON sp.id = a.subscription_plan_id
       WHERE a.is_personal = 0
         AND a.is_active = 1
         AND a.is_public = 1
       ORDER BY a.name ASC`,
      []
    );

    // Get personal agents
    const personalAgents = await query<any[]>(
      `SELECT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
       FROM ai_agents a
       LEFT JOIN users u ON u.username = a.owner_username
       WHERE a.is_personal = 1
         AND a.workspace_id ${activeWorkspaceId ? '= ?' : 'IS NULL'}
         ${canManageWorkspace && forSettings ? '' : 'AND a.owner_username = ?'}
         ${forSettings ? '' : 'AND a.is_active = 1'}
       ORDER BY a.updated_at DESC, a.name ASC`,
      activeWorkspaceId
        ? (canManageWorkspace && forSettings ? [activeWorkspaceId] : [activeWorkspaceId, user.username])
        : (canManageWorkspace && forSettings ? [] : [user.username])
    );

    const agents = dedupeAgents([...personalAgents, ...workerAgents, ...fallbackWorkerAgents]);
    return NextResponse.json({ success: true, agents });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const data = await req.json();
    if (!data.name || !data.system_prompt) {
      return NextResponse.json({ success: false, error: 'name and system_prompt required' }, { status: 400 });
    }
    // Regular users can only create Personal AI; only Super Admin creates Worker AI
    const isSuperAdmin = (await import('@/lib/workspace-permissions')).isPlatformSuperAdminUser(user as any);
    if (!isSuperAdmin) {
      data.is_personal = 1;
      data.owner_username = user.username;
    }
    const agent = await ChatModel.createAgent({ ...data, workspace_id: workspaceContext.activeWorkspace?.workspace_id || null }, user.username);

    try {
      const admins = await query<any[]>('SELECT username FROM users WHERE role = "admin"');
      for (const admin of admins) {
        if (admin.username !== user.username) {
          await query(
            `INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, 'ai_action', ?, ?, ?)
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [admin.username, `New AI Agent dibuat oleh ${user.full_name || user.username}`, `"${agent.name}" (${agent.role || 'AI Agent'}) telah dibuat dan perlu di-review`, JSON.stringify({ agent_id: agent.agent_id, created_by: user.username })]
          );
        }
      }
    } catch {}

    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
