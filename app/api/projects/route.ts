import { NextRequest, NextResponse } from 'next/server';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext, buildWorkspaceEntityScope } from '@/lib/workspace-context';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const { activeWorkspace, memberUsernames } = await getRequestWorkspaceContext(request);
    const scopeUsernames = memberUsernames.length > 0 ? memberUsernames : [auth.user.username];
    const scope = buildWorkspaceEntityScope('p', activeWorkspace?.workspace_id, scopeUsernames);

    const projects = await query<any[]>(`
      SELECT p.*, COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      WHERE ${scope.sql}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, scope.params);

    return NextResponse.json({ success: true, data: projects, activeWorkspace });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const { activeWorkspace } = await getRequestWorkspaceContext(request);
    const body = await request.json();
    const result = await ProjectModel.create({
      ...body,
      workspace_id: activeWorkspace?.workspace_id || null,
      created_by_id: auth.user.id
    }, getAuditActor(auth.user));

    if (result.success) {
      return NextResponse.json({ success: true, id: result.id });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
