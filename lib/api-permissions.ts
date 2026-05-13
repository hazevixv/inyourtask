import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess, type WorkspaceAccessUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function requireWorkspaceAdmin(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Workspace admin access required' },
        { status: 403 }
      )
    } as const;
  }

  const workspaceContext = await getRequestWorkspaceContext(request);
  if (!hasWorkspaceAdminAccess(user as WorkspaceAccessUser, workspaceContext.activeWorkspace)) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Workspace admin access required' },
        { status: 403 }
      )
    } as const;
  }

  return { user: user as WorkspaceAccessUser };
}
