import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/AuthModel';
import { WorkspaceModel } from '@/models/WorkspaceModel';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const result = await AuthModel.verifySession(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const sessionUser = result.user;
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    await WorkspaceModel.ensureUserWorkspace(sessionUser);
    const workspaces = await WorkspaceModel.getUserWorkspaces(sessionUser.username);
    const preferredWorkspaceId = request.cookies.get('active_workspace_id')?.value || null;
    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(sessionUser.username, preferredWorkspaceId);

    const response = NextResponse.json({
      success: true,
      user: result.user,
      workspaces,
      activeWorkspace
    });

    if (activeWorkspace && activeWorkspace.workspace_id !== preferredWorkspaceId) {
      response.cookies.set('active_workspace_id', activeWorkspace.workspace_id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
