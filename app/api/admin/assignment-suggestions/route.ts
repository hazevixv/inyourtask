import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { buildAssignmentSuggestions } from '@/lib/assignment-suggestions';
import { query } from '@/lib/db';
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
    const data = await buildAssignmentSuggestions({
      workspaceId: workspaceContext.activeWorkspace?.workspace_id || null,
      usernames: workspaceContext.memberUsernames,
      workspaceName: workspaceContext.activeWorkspace?.name || null
    });
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to build suggestions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const workspaceContext = await getRequestWorkspaceContext(request);

  if (!hasWorkspaceAdminAccess(auth.user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { mode = 'high_confidence' } = await request.json().catch(() => ({}));
    const data = await buildAssignmentSuggestions({
      workspaceId: workspaceContext.activeWorkspace?.workspace_id || null,
      usernames: workspaceContext.memberUsernames,
      workspaceName: workspaceContext.activeWorkspace?.name || null
    });
    const selected = data.suggestions
      .filter((item) => !item.already_assigned && item.suggestions.length > 0)
      .filter((item) => {
        const confidence = item.suggestions[0].confidence;
        return mode === 'all' ? true : confidence === 'high';
      });

    let applied = 0;
    for (const item of selected) {
      const candidate = item.suggestions[0];
      await query(
        `INSERT INTO org_unit_staff (org_unit_id, username, role, is_primary, assigned_by, assigned_at)
         VALUES (?, ?, 'staff', TRUE, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           role = VALUES(role),
           is_primary = VALUES(is_primary),
           assigned_by = VALUES(assigned_by),
           assigned_at = CURRENT_TIMESTAMP`,
        [candidate.org_unit_id, item.username, auth.user.username]
      );
      applied++;
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${applied} suggested assignments`,
      applied
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to apply suggestions' }, { status: 500 });
  }
}
