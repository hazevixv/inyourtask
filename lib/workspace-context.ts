import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { WorkspaceModel } from '@/models/WorkspaceModel';

export async function getRequestWorkspaceContext(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return { user: null, activeWorkspace: null, memberUsernames: [] as string[] };

  await WorkspaceModel.ensureUserWorkspace(user);
  const preferredWorkspaceId = req.cookies.get('active_workspace_id')?.value || null;
  const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, preferredWorkspaceId);
  if (activeWorkspace?.workspace_id) {
    await WorkspaceModel.ensureWorkspaceDefaultAgents(activeWorkspace.workspace_id, user.username);
  }
  const memberUsernames = activeWorkspace
    ? await WorkspaceModel.getWorkspaceMemberUsernames(activeWorkspace.workspace_id)
    : [user.username];

  return { user, activeWorkspace, memberUsernames };
}

export function buildWorkspaceTextScope(
  alias: string,
  usernames: string[],
  options?: {
    ownerColumn?: string;
    assigneeColumn?: string;
  }
) {
  const safeUsernames = Array.from(new Set((usernames || []).map(u => String(u || '').trim()).filter(Boolean)));
  if (safeUsernames.length === 0) {
    return { sql: '1=0', params: [] as string[] };
  }

  const ownerColumn = options?.ownerColumn || 'owner';
  const assigneeColumn = options?.assigneeColumn || 'assignees';
  const clauses = safeUsernames.map(() => `(${alias}.${ownerColumn} = ? OR FIND_IN_SET(?, REPLACE(COALESCE(${alias}.${assigneeColumn}, ''), ' ', '')) > 0)`);
  const params: string[] = [];
  for (const username of safeUsernames) {
    params.push(username, username);
  }

  return { sql: clauses.join(' OR '), params };
}

export function buildWorkspaceEntityScope(
  alias: string,
  workspaceId: string | null | undefined,
  usernames: string[],
  options?: {
    ownerColumn?: string;
    assigneeColumn?: string;
  }
) {
  if (workspaceId) {
    return {
      sql: `${alias}.workspace_id = ?`,
      params: [workspaceId]
    };
  }

  return buildWorkspaceTextScope(alias, usernames, options);
}
