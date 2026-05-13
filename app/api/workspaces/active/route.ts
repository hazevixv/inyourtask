import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { WorkspaceModel } from '@/models/WorkspaceModel';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { workspace_id } = await req.json();
    const workspaceId = String(workspace_id || '').trim();
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, workspaceId);
    if (!activeWorkspace || activeWorkspace.workspace_id !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true, activeWorkspace });
    response.cookies.set('active_workspace_id', workspaceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = String(body?.workspace_id || req.cookies.get('active_workspace_id')?.value || '').trim();
    const name = body?.name !== undefined ? String(body.name || '').trim() : undefined;
    const description = body?.description !== undefined ? String(body.description || '').trim() : undefined;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, workspaceId);
    if (!activeWorkspace || activeWorkspace.workspace_id !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace not found or access denied' }, { status: 403 });
    }

    if (!hasWorkspaceAdminAccess(user as any, activeWorkspace)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined && name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No changes provided' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(workspaceId);

    await query(`UPDATE workspaces SET ${updates.join(', ')} WHERE workspace_id = ?`, values);

    const updated = await WorkspaceModel.resolveWorkspaceListItem(workspaceId, user.username);
    const response = NextResponse.json({ success: true, activeWorkspace: updated });
    response.cookies.set('active_workspace_id', workspaceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = String(body?.workspace_id || req.cookies.get('active_workspace_id')?.value || '').trim();
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, workspaceId);
    if (!activeWorkspace || activeWorkspace.workspace_id !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace not found or access denied' }, { status: 403 });
    }

    if (!hasWorkspaceAdminAccess(user as any, activeWorkspace)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await query('UPDATE workspaces SET is_active = 0, updated_at = NOW() WHERE workspace_id = ?', [workspaceId]);

    const remainingWorkspaces = await WorkspaceModel.getUserWorkspaces(user.username);
    const nextWorkspace = remainingWorkspaces[0] || null;
    const response = NextResponse.json({
      success: true,
      archivedWorkspaceId: workspaceId,
      activeWorkspace: nextWorkspace
    });

    if (nextWorkspace?.workspace_id) {
      response.cookies.set('active_workspace_id', nextWorkspace.workspace_id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    } else {
      response.cookies.delete('active_workspace_id');
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
