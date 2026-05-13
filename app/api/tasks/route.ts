import { NextRequest, NextResponse } from 'next/server';
import { TaskModel } from '@/models/TaskModel';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext, buildWorkspaceEntityScope } from '@/lib/workspace-context';
import { normalizeCsvList, normalizeOptionalDate, normalizeText } from '@/lib/normalizers';

const tasksCache: Record<string, { ts: number; data: any[]; activeWorkspace: any }> = {};
const TASKS_CACHE_TTL = 15_000;
const recentTaskCreates = new Map<string, { ts: number; response?: { success: boolean; id?: string; error?: string }; promise?: Promise<{ success: boolean; id?: string; error?: string }> }>();
const CREATE_DEDUPE_TTL = 10_000;

function cleanupRecentTaskCreates() {
  const now = Date.now();
  recentTaskCreates.forEach((value, key) => {
    if (now - value.ts > CREATE_DEDUPE_TTL) {
      recentTaskCreates.delete(key);
    }
  });
}

function getTaskCreateFingerprint(username: string, workspaceId: string | null | undefined, body: any) {
  return JSON.stringify({
    username: normalizeText(username)?.toLowerCase() || '',
    workspaceId: normalizeText(workspaceId)?.toLowerCase() || '',
    task_name: normalizeText(body?.task_name)?.toLowerCase() || '',
    project_id: normalizeText(body?.project_id)?.toLowerCase() || '',
    assignees: normalizeCsvList(body?.assignees)?.toLowerCase() || '',
    status: normalizeText(body?.status)?.toLowerCase() || '',
    priority: normalizeText(body?.priority)?.toLowerCase() || '',
    progress: normalizeText(body?.progress)?.toLowerCase() || '',
    due_date: normalizeOptionalDate(body?.due_date) || '',
    notes: normalizeText(body?.notes)?.toLowerCase() || '',
    url: normalizeText(body?.url)?.toLowerCase() || '',
    brief: normalizeText(body?.brief)?.toLowerCase() || '',
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const { activeWorkspace, memberUsernames } = await getRequestWorkspaceContext(request);
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.get('nocache') === '1';
    const cacheKey = `${auth.user.username}:${activeWorkspace?.workspace_id || 'none'}:tasks`;

    if (!noCache) {
      const cached = tasksCache[cacheKey];
      if (cached && Date.now() - cached.ts < TASKS_CACHE_TTL) {
        return NextResponse.json({ success: true, data: cached.data, activeWorkspace: cached.activeWorkspace }, {
          headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=25' }
        });
      }
    }

    const scopeUsernames = memberUsernames.length > 0 ? memberUsernames : [auth.user.username];
    const scope = buildWorkspaceEntityScope('t', activeWorkspace?.workspace_id, scopeUsernames, {
      ownerColumn: 'assignee',
      assigneeColumn: 'assignees'
    });

    const tasks = await query<any[]>(`
      SELECT *
      FROM tasks t
      WHERE ${scope.sql}
      ORDER BY t.updated_at DESC
    `, scope.params);

    tasksCache[cacheKey] = { ts: Date.now(), data: tasks, activeWorkspace };
    return NextResponse.json({ success: true, data: tasks, activeWorkspace }, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=25' }
    });
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
    const fingerprint = getTaskCreateFingerprint(auth.user.username, activeWorkspace?.workspace_id, body);
    cleanupRecentTaskCreates();

    const existing = recentTaskCreates.get(fingerprint);
    if (existing?.response) {
      return NextResponse.json({ ...existing.response, duplicatePrevented: true });
    }
    if (existing?.promise) {
      const inFlightResult = await existing.promise;
      return NextResponse.json({ ...inFlightResult, duplicatePrevented: true }, { status: inFlightResult.success ? 200 : 400 });
    }

    const createPromise = TaskModel.create({
      ...body,
      workspace_id: activeWorkspace?.workspace_id || null,
      created_by_id: auth.user.id
    }, getAuditActor(auth.user));
    recentTaskCreates.set(fingerprint, { ts: Date.now(), promise: createPromise });

    const result = await createPromise;
    recentTaskCreates.set(fingerprint, { ts: Date.now(), response: result });

    if (result.success) {
      Object.keys(tasksCache).forEach((key) => {
        if (key.startsWith(`${auth.user.username}:`)) delete tasksCache[key];
      });
      if (body.due_date && body.project_id) {
        await ProjectModel.syncDueDate(body.project_id);
      }
      return NextResponse.json({ success: true, id: result.id });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
