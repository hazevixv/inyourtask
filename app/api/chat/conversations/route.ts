import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { memberUsernames, activeWorkspace } = await getRequestWorkspaceContext(req);
    const convs = await ChatModel.getConversationsForUser(user.username, memberUsernames, activeWorkspace?.workspace_id || null);
    return NextResponse.json({ success: true, conversations: convs });
  } catch (e: any) {
    console.error('[Chat Conversations GET] Error:', e);
    
    // Check if error is due to missing tables
    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat database tables not found. Please run CHAT-DATABASE-SETUP.sql first.',
        hint: 'Check 00-documentation/CHAT-DATABASE-SETUP.sql'
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { type, name, members, agentId, email } = body;
    const { memberUsernames, activeWorkspace } = await getRequestWorkspaceContext(req);
    const workspaceId = activeWorkspace?.workspace_id || null;

    let convId: string;
    if (type === 'direct') {
      // Support both username and email for direct messages
      let targetUsername: string;
      
      if (email && email.trim()) {
        // Look up user by email
        const { query } = await import('@/lib/db');
        const users = await query<any[]>(
          'SELECT username, full_name FROM users WHERE email = ? AND is_active = 1',
          [email.trim()]
        );
        
        if (!users[0]) {
          return NextResponse.json({ 
            success: false, 
            error: 'User not found with that email address' 
          }, { status: 404 });
        }
        
        targetUsername = users[0].username;
      } else if (members?.[0]) {
        targetUsername = members[0];
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Target user email or username required' 
        }, { status: 400 });
      }
      
      // Check if trying to message yourself
      if (targetUsername === user.username) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot create direct message with yourself' 
        }, { status: 400 });
      }

      if (memberUsernames.length > 0 && !memberUsernames.includes(targetUsername)) {
        return NextResponse.json({ success: false, error: 'Target user is not in the active workspace' }, { status: 403 });
      }
      
      convId = await ChatModel.createDirectConversation(user.username, targetUsername, workspaceId);
    } else if (type === 'group') {
      if (!name) return NextResponse.json({ success: false, error: 'Group name required' }, { status: 400 });
      const invalidMember = (members || []).find((member: string) => memberUsernames.length > 0 && !memberUsernames.includes(member));
      if (invalidMember) {
        return NextResponse.json({ success: false, error: 'Group members must belong to the active workspace' }, { status: 403 });
      }
      convId = await ChatModel.createGroupConversation(name, members || [], user.username, workspaceId);
    } else if (type === 'ai_agent' || type === 'ai_personal') {
      if (!agentId) return NextResponse.json({ success: false, error: 'Agent ID required' }, { status: 400 });
      if (type === 'ai_agent') {
        const agent = await ChatModel.getAgentById(agentId);
        if (!agent) {
          return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
        }

        const existing = await query<any[]>(
          'SELECT * FROM user_agent_assignments WHERE agent_id = ? AND username = ?',
          [agentId, user.username]
        );
        const isManuallyGranted = Boolean(existing[0]?.is_active);
        const accessType = String(agent.access_type || 'free').toLowerCase();

        if (!isManuallyGranted) {
          if (accessType === 'subscription') {
            const subscription = await ChatModel.getUserActiveSubscription(user.username);
            const requiredPlanId = Number(agent.subscription_plan_id || 0);
            const userPlanId = Number(subscription?.plan_id || 0);
            if (!subscription || (requiredPlanId && requiredPlanId !== userPlanId)) {
              return NextResponse.json({
                success: false,
                error: 'Worker ini memerlukan subscription aktif',
                code: 'subscription_required',
              }, { status: 403 });
            }
          }

          if (accessType === 'code') {
            return NextResponse.json({
              success: false,
              error: 'Activation code diperlukan',
              code: 'activation_code_required',
            }, { status: 403 });
          }
        }
      }
      convId = await ChatModel.createAIAgentConversation(user.username, agentId, type === 'ai_personal', workspaceId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    const conv = await ChatModel.getConversationById(convId);
    return NextResponse.json({ success: true, conversation: conv, conv_id: convId });
  } catch (e: any) {
    console.error('[Chat Conversations POST] Error:', e);
    
    // Check if error is due to missing tables
    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat database tables not found. Please run COMPLETE-DATABASE-MIGRATION.sql first.',
        hint: 'Check 00-documentation/COMPLETE-DATABASE-MIGRATION.sql'
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
