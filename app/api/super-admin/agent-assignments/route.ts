import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { ChatModel } from '@/models/ChatModel';
import { query } from '@/lib/db';

/**
 * GET /api/super-admin/agent-assignments
 * List all agent-to-user access grants
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const assignments = await ChatModel.getAllAssignments();
    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/agent-assignments
 * Grant agent access to user(s)
 * Body: { agent_id, usernames: string[], access_type: 'free'|'subscription'|'code' }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { agent_id, usernames, access_type } = body;

    if (!agent_id || !usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ success: false, error: 'agent_id and usernames array required' }, { status: 400 });
    }

    const count = await ChatModel.assignAgentToManyUsers(agent_id, usernames, auth.user.username, access_type || 'free');

    return NextResponse.json({ success: true, data: { assigned: count, total: usernames.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/super-admin/agent-assignments
 * Remove agent access from a user
 * Query: agent_id, username
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    const username = searchParams.get('username');

    if (!agent_id || !username) {
      return NextResponse.json({ success: false, error: 'agent_id and username required' }, { status: 400 });
    }

    await ChatModel.removeAgentFromUser(agent_id, username);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
