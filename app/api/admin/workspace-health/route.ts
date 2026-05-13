import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getWorkspaceAudit } from '@/lib/workspace-audit';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const workspaceContext = await getRequestWorkspaceContext(request);

  if (!hasWorkspaceAdminAccess(auth.user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const audit = await getWorkspaceAudit();
    return NextResponse.json({ success: true, audit });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load workspace health' },
      { status: 500 }
    );
  }
}
