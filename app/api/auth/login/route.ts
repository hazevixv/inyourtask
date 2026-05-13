import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/AuthModel';
import { WorkspaceModel } from '@/models/WorkspaceModel';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = await AuthModel.login(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    await WorkspaceModel.ensureUserWorkspace(result.user!);
    const workspaces = await WorkspaceModel.getUserWorkspaces(username);
    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(username);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      workspaces,
      activeWorkspace
    });

    response.cookies.set('session_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    if (activeWorkspace) {
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
