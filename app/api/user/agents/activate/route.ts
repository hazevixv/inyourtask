import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { ChatModel } from '@/models/ChatModel';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * POST /api/user/agents/activate
 * Activate a Worker AI agent for the current user and create chat conversation
 * Body: { agent_id, activation_code? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const body = await req.json();
    const { agent_id } = body;
    const activationCode = String(body.activation_code || '').trim();
    if (!agent_id) {
      return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });
    }

    const targetAgent = await ChatModel.getAgentById(agent_id);
    if (!targetAgent) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
    }
    if (Number(targetAgent.is_personal) === 1) {
      return NextResponse.json({ success: false, error: 'Personal AI should be opened from your own AI list' }, { status: 400 });
    }
    if (Number(targetAgent.is_active) !== 1) {
      return NextResponse.json({ success: false, error: 'Agent is inactive' }, { status: 403 });
    }

    // Check if already assigned
    const existing = await query<any[]>(
      'SELECT * FROM user_agent_assignments WHERE agent_id = ? AND username = ?',
      [agent_id, user.username]
    );
    if (existing[0]?.is_active) {
      // Already assigned — ensure conversation exists
      await ChatModel.createAIAgentConversation(user.username, agent_id, false, workspaceId);
      return NextResponse.json({ success: true, data: { already_active: true } });
    }

    const accessType = String(targetAgent.access_type || 'free').toLowerCase();
    const assignedAccessType = String(existing[0]?.access_type || '').toLowerCase();
    const isManuallyGranted = Boolean(existing[0]?.is_active);
    const resolvedAccessType: 'free' | 'subscription' | 'code' =
      assignedAccessType === 'subscription'
        ? 'subscription'
        : assignedAccessType === 'code'
          ? 'code'
          : accessType === 'subscription'
            ? 'subscription'
            : accessType === 'code'
              ? 'code'
              : 'free';

    if (!isManuallyGranted) {
      if (accessType === 'subscription') {
        const subscription = await ChatModel.getUserActiveSubscription(user.username);
        const requiredPlanId = Number(targetAgent.subscription_plan_id || 0);
        const userPlanId = Number(subscription?.plan_id || 0);
        if (!subscription || (requiredPlanId && requiredPlanId !== userPlanId)) {
          return NextResponse.json({
            success: false,
            error: 'Worker ini memerlukan subscription aktif',
            code: 'subscription_required',
            required_plan_id: requiredPlanId || null,
          }, { status: 403 });
        }
      }

      if (accessType === 'code') {
        const expectedCode = String(targetAgent.agent_code || '').trim();
        const providedCode = activationCode || String(existing[0]?.activation_code || '').trim();
        if (!expectedCode) {
          return NextResponse.json({
            success: false,
            error: 'Worker code-based belum punya activation code',
            code: 'activation_code_missing',
          }, { status: 400 });
        }
        if (!providedCode || providedCode !== expectedCode) {
          return NextResponse.json({
            success: false,
            error: 'Activation code diperlukan',
            code: 'activation_code_required',
          }, { status: 403 });
        }
      }
    }

    // Assign the agent to this user
    await ChatModel.assignAgentToUser(
      agent_id,
      user.username,
      'system',
      resolvedAccessType,
      activationCode || targetAgent.agent_code || existing[0]?.activation_code || undefined
    );

    // Create chat conversation for this agent
    const convId = await ChatModel.createAIAgentConversation(user.username, agent_id, false, workspaceId);

    // Send welcome message from agent
    try {
      const agentName = targetAgent.name || 'AI Assistant';
      await ChatModel.sendMessage(
        convId,
        agent_id,
        `Halo ${user.full_name || user.username}! Saya adalah **${agentName}**. Saya siap membantu pekerjaan Anda. Apa yang bisa saya bantu hari ini?`,
        'ai'
      );
    } catch { /* ignore welcome msg error */ }

    return NextResponse.json({ success: true, data: { agent_id, username: user.username, conv_id: convId } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
