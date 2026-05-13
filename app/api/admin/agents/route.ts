import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/** GET /api/admin/agents - list all AI agents */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  let agents: any[] = [];
  const baseQuery = `
    SELECT a.agent_id, a.name, a.description, a.avatar, a.role, a.model,
           a.is_active, a.is_personal, a.owner_username, a.created_at,
           a.system_prompt, a.knowledge_base, a.access_type, a.is_public,
           a.agent_code, a.max_activations,
           u.avatar as owner_avatar, u.full_name as owner_full_name,
           (SELECT COUNT(*) FROM agent_role_assignments ara WHERE ara.agent_id = a.agent_id) AS role_count
    FROM ai_agents a
    LEFT JOIN users u ON u.username = a.owner_username
  `;

  if (isSuperAdmin || !activeWorkspaceId) {
    agents = await query<any[]>(`${baseQuery} ORDER BY a.is_personal ASC, a.name ASC`);
  } else {
    agents = await query<any[]>(
      `${baseQuery} WHERE a.workspace_id = ? OR a.is_personal = 0 ORDER BY a.is_personal ASC, a.name ASC`,
      [activeWorkspaceId]
    );
  }

  return NextResponse.json({ success: true, agents });
}

/** POST /api/admin/agents - create new AI agent */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;
  const isSuperAdmin = isPlatformSuperAdminUser(adminUser as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const body = await req.json();
  const { name, description, role, system_prompt, knowledge_base, model, is_personal } = body;

  if (!name || !system_prompt) {
    return NextResponse.json({ success: false, error: 'name and system_prompt are required' }, { status: 400 });
  }

  const isPersonal = is_personal ? 1 : 0;

  // Workspace admin (non-superadmin) only allowed to create Personal AI
  if (!isSuperAdmin && !isPersonal) {
    return NextResponse.json({ success: false, error: 'Hanya Super Admin yang dapat membuat Worker AI. Anda hanya dapat membuat Personal AI.' }, { status: 403 });
  }

  const agentId = `agent-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

  await query(
    `INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, knowledge_base, model, is_active, is_personal, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [agentId, isPersonal ? activeWorkspaceId : null, name, description || null, role || null, system_prompt, knowledge_base || null, model || 'openai/gpt-oss-20b', isPersonal, adminUser.username]
  );

  const agents = await query<any[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]);
  return NextResponse.json({ success: true, agent: agents[0] });
}

/** PUT /api/admin/agents - update AI agent */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const body = await req.json();
  const { agent_id, name, description, avatar, role, model, is_active, system_prompt, knowledge_base } = body;

  if (!agent_id) return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });

  // Check agent type
  const targetAgent = await query<any[]>('SELECT is_personal, workspace_id FROM ai_agents WHERE agent_id = ?', [agent_id]);
  if (targetAgent.length === 0) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
  }

  const agent = targetAgent[0];

  // Workspace admin can only update Personal AI (not Worker AI)
  if (!isSuperAdmin) {
    if (!agent.is_personal) {
      return NextResponse.json({ success: false, error: 'Hanya Super Admin yang dapat mengubah Worker AI.' }, { status: 403 });
    }
    if (activeWorkspaceId && agent.workspace_id !== activeWorkspaceId) {
      return NextResponse.json({ success: false, error: 'Agent is not part of the active workspace' }, { status: 403 });
    }
  }

  await query(
    `UPDATE ai_agents SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      avatar = COALESCE(?, avatar),
      role = COALESCE(?, role),
      model = COALESCE(?, model),
      is_active = COALESCE(?, is_active),
      system_prompt = COALESCE(?, system_prompt),
      knowledge_base = COALESCE(?, knowledge_base),
      updated_at = NOW()
     WHERE agent_id = ?`,
    [name, description, avatar, role, model, is_active, system_prompt, knowledge_base, agent_id]
  );

  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/agents - delete AI agent */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

  const { searchParams } = new URL(req.url);
  const agent_id = searchParams.get('agent_id');

  if (!agent_id) return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });

  // Check agent type
  const targetAgent = await query<any[]>('SELECT is_personal, workspace_id FROM ai_agents WHERE agent_id = ?', [agent_id]);
  if (targetAgent.length === 0) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
  }

  const agent = targetAgent[0];

  // Workspace admin can only delete Personal AI
  if (!isSuperAdmin) {
    if (!agent.is_personal) {
      return NextResponse.json({ success: false, error: 'Hanya Super Admin yang dapat menghapus Worker AI.' }, { status: 403 });
    }
    if (activeWorkspaceId && agent.workspace_id !== activeWorkspaceId) {
      return NextResponse.json({ success: false, error: 'Agent is not part of the active workspace' }, { status: 403 });
    }
  }

  await query('DELETE FROM agent_role_assignments WHERE agent_id = ?', [agent_id]);
  await query('DELETE FROM ai_agent_memory WHERE agent_id = ?', [agent_id]);
  await query('UPDATE chat_conversations SET is_archived = 1 WHERE agent_id = ?', [agent_id]);
  await query('DELETE FROM ai_agents WHERE agent_id = ?', [agent_id]);

  return NextResponse.json({ success: true });
}
