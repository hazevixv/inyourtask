import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { WorkspaceModel } from '@/models/WorkspaceModel';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await WorkspaceModel.ensureUserWorkspace(user);
    const workspaces = await WorkspaceModel.getUserWorkspaces(user.username);
    const activeWorkspaceId = req.cookies.get('active_workspace_id')?.value || null;
    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, activeWorkspaceId);

    return NextResponse.json({
      success: true,
      workspaces,
      activeWorkspace
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = String(body?.name || '').trim();
    const type = body?.type === 'personal' ? 'personal' : body?.type === 'company' ? 'company' : 'team';
    const description = body?.description ? String(body.description).trim() : null;

    const created = await WorkspaceModel.createWorkspaceForUser({
      username: user.username,
      fullName: user.full_name,
      workspaceName: name || undefined,
      workspaceType: name ? type : 'personal',
      createdBy: user.username
    });

    if (!created.success || !created.workspace) {
      return NextResponse.json({ success: false, error: created.error || 'Failed to create workspace' }, { status: 400 });
    }

    if (description) {
      // Store description separately so the workspace is still created even if this step fails.
      await WorkspaceModel.getWorkspaceById(created.workspace.workspace_id).then(async (workspace) => {
        if (workspace) {
          const { query } = await import('@/lib/db');
          await query('UPDATE workspaces SET description = ? WHERE workspace_id = ?', [description, workspace.workspace_id]);
        }
      }).catch(() => {});
    }

    const response = NextResponse.json({ success: true, workspace: created.workspace });
    response.cookies.set('active_workspace_id', created.workspace.workspace_id, {
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
