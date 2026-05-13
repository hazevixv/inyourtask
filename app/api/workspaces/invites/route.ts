import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { WorkspaceModel, type WorkspaceMemberRole } from '@/models/WorkspaceModel';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

function resolveRole(value: any): WorkspaceMemberRole {
  return value === 'owner' || value === 'admin' || value === 'manager' || value === 'guest' ? value : 'member';
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);

    const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
    const targetWorkspaceId = workspaceId || req.cookies.get('active_workspace_id')?.value || '';
    if (!targetWorkspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const isPlatformAdmin = hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
    const canManage = isPlatformAdmin || await WorkspaceModel.isWorkspaceAdmin(targetWorkspaceId, user.username);
    if (!canManage) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const invites = await WorkspaceModel.getWorkspaceInvites(targetWorkspaceId);
    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);

    const body = await req.json();
    const workspaceId = String(body?.workspace_id || req.cookies.get('active_workspace_id')?.value || '').trim();
    const email = body?.email ? String(body.email).trim() : null;
    const role = resolveRole(body?.role);
    const expiresInDays = Number.isFinite(Number(body?.expires_in_days)) ? Number(body.expires_in_days) : 7;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const isPlatformAdmin = hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
    const canManage = isPlatformAdmin || await WorkspaceModel.isWorkspaceAdmin(workspaceId, user.username);
    if (!canManage) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays));

    const result = await WorkspaceModel.createInvite({
      workspaceId,
      invitedBy: user.username,
      role,
      email,
      expiresAt
    });

    if (!result.success || !result.invite) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite: result.invite });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
