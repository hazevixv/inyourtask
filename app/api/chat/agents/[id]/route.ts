import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const agent = await ChatModel.getAgentById(params.id);
    if (!agent) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Admin and superadmin can see any agent
    if (!isPlatformSuperAdminUser(user as any) && !hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
      const availableWorkerAgents = await ChatModel.getAvailableWorkerAgents(user.username, activeWorkspaceId);
      const visible = (agent.is_personal === 1 && agent.owner_username === user.username)
        || availableWorkerAgents.some((item: any) => item.agent_id === params.id);
      if (!visible) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const isSuperAdmin = isPlatformSuperAdminUser(user as any);

    const agent = await query<any[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [params.id]);
    if (!agent[0]) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });

    const isPersonal = agent[0].is_personal === 1;
    const isOwner = agent[0].owner_username === user.username || agent[0].created_by === user.username;
    const isAdmin = hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);

    // Permission matrix:
    // - Personal AI: owner or admin can edit
    // - Worker AI: only superadmin can edit
    if (isPersonal) {
      if (!isOwner && !isAdmin && !isSuperAdmin) {
        return NextResponse.json({ success: false, error: 'You can only edit your own Personal AI' }, { status: 403 });
      }
    } else {
      if (!isSuperAdmin) {
        return NextResponse.json({ success: false, error: 'Hanya Super Admin yang dapat mengubah Worker AI' }, { status: 403 });
      }
    }

    const data = await req.json();
    await ChatModel.updateAgent(params.id, data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const isSuperAdmin = isPlatformSuperAdminUser(user as any);

    const agent = await query<any[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [params.id]);
    if (!agent[0]) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });

    const isPersonal = agent[0].is_personal === 1;
    const isOwner = agent[0].owner_username === user.username || agent[0].created_by === user.username;
    const isAdmin = hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);

    // Permission matrix:
    // - Personal AI: owner or admin can delete
    // - Worker AI: only superadmin can delete
    if (isPersonal) {
      if (!isOwner && !isAdmin && !isSuperAdmin) {
        return NextResponse.json({ success: false, error: 'You can only delete your own Personal AI' }, { status: 403 });
      }
    } else {
      if (!isSuperAdmin) {
        return NextResponse.json({ success: false, error: 'Hanya Super Admin yang dapat menghapus Worker AI' }, { status: 403 });
      }
    }

    await query('DELETE FROM chat_messages WHERE conv_id IN (SELECT conv_id FROM chat_conversations WHERE agent_id = ?)', [params.id]);
    await query('DELETE FROM chat_members WHERE conv_id IN (SELECT conv_id FROM chat_conversations WHERE agent_id = ?)', [params.id]);
    await query('DELETE FROM chat_conversations WHERE agent_id = ?', [params.id]);
    await query('DELETE FROM ai_agent_memory WHERE agent_id = ?', [params.id]);
    await query('DELETE FROM ai_agents WHERE agent_id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
