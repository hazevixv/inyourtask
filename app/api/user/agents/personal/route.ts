import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { ChatModel } from '@/models/ChatModel';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * GET /api/user/agents/personal
 * Get user's personal AI count and limit info
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const limitInfo = await ChatModel.canCreatePersonalAI(user.username);
    const personalAgents = await query<any[]>(
      `SELECT * FROM ai_agents WHERE is_personal = 1 AND owner_username = ? ${workspaceId ? 'AND workspace_id = ?' : ''} ORDER BY created_at DESC`,
      workspaceId ? [user.username, workspaceId] : [user.username]
    );

    return NextResponse.json({
      success: true,
      data: {
        personalAgents,
        limitInfo
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/user/agents/personal
 * Create a new Personal AI agent with limit enforcement
 * Body: { name, system_prompt, model }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const body = await req.json();
    const name = String(body.name || '').trim();
    const systemPrompt = String(body.system_prompt || '').trim();
    let model = String(body.model || '').trim();

    if (!name || !systemPrompt) {
      return NextResponse.json({ success: false, error: 'Name and system_prompt are required' }, { status: 400 });
    }

    // Check limit
    const limitInfo = await ChatModel.canCreatePersonalAI(user.username);
    if (!limitInfo.allowed) {
      return NextResponse.json({ success: false, error: limitInfo.reason || 'Batas Personal AI tercapai' }, { status: 403 });
    }

    // Check subscription for model restriction
    const sub = await ChatModel.getUserActiveSubscription(user.username);
    const isPro = sub && (sub.max_personal_ai === -1 || sub.max_personal_ai > 3);

    // Free tier: force llama-3.1-8b-instant
    if (!isPro) {
      if (model && model !== 'llama-3.1-8b-instant' && model !== 'openai/gpt-oss-20b') {
        model = 'llama-3.1-8b-instant';
      } else if (!model) {
        model = 'llama-3.1-8b-instant';
      }
    } else {
      if (!model) model = 'openai/gpt-oss-20b';
    }

    const agentId = `personal-${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const role = body.role || 'Personal Assistant';

    await query(
      `INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, knowledge_base, model, is_personal, owner_username, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)`,
      [agentId, workspaceId, name, body.description || null, role, systemPrompt, body.knowledge_base || null, model, user.username, user.username]
    );

    // Create conversation
    await ChatModel.createAIAgentConversation(user.username, agentId, true, workspaceId);

    const agent = await ChatModel.getAgentById(agentId);
    return NextResponse.json({ success: true, data: agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
