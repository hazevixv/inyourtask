import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { ChatModel } from '@/models/ChatModel';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

function dedupeAgents(list: any[]) {
  const map = new Map<string, any>();
  for (const agent of list) {
    if (!agent?.agent_id) continue;
    if (!map.has(agent.agent_id)) map.set(agent.agent_id, agent);
  }
  return Array.from(map.values());
}

/**
 * GET /api/user/agents/available
 * List Worker AI agents available to the current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const agents = await ChatModel.getAvailableWorkerAgents(user.username, workspaceId);
    const fallbackAgents = await query<any[]>(`
      SELECT a.*
      FROM ai_agents a
      WHERE a.is_personal = 0
        AND a.is_active = 1
        AND a.is_public = 1
      ORDER BY a.name ASC
    `, []);
    const assignments = await ChatModel.getUserAssignments(user.username);

    return NextResponse.json({
      success: true,
      data: dedupeAgents([...agents, ...fallbackAgents]),
      assignments
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
