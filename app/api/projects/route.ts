import { NextRequest, NextResponse } from 'next/server';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext, buildWorkspaceEntityScope } from '@/lib/workspace-context';
import { normalizeCsvList, normalizeText } from '@/lib/normalizers';

const projectsCache: Record<string, { ts: number; data: any[]; activeWorkspace: any }> = {};
const PROJECTS_CACHE_TTL = 15_000;
const recentProjectCreates = new Map<string, { ts: number; response?: { success: boolean; id?: string; error?: string }; promise?: Promise<{ success: boolean; id?: string; error?: string }> }>();
const CREATE_DEDUPE_TTL = 10_000;

function cleanupRecentProjectCreates() {
  const now = Date.now();
  recentProjectCreates.forEach((value, key) => {
    if (now - value.ts > CREATE_DEDUPE_TTL) {
      recentProjectCreates.delete(key);
    }
  });
}

function getProjectCreateFingerprint(username: string, workspaceId: string | null | undefined, body: any) {
  return JSON.stringify({
    username: normalizeText(username)?.toLowerCase() || '',
    workspaceId: normalizeText(workspaceId)?.toLowerCase() || '',
    project_name: normalizeText(body?.project_name)?.toLowerCase() || '',
    category: normalizeText(body?.category)?.toLowerCase() || '',
    owner: normalizeText(body?.owner)?.toLowerCase() || '',
    assignees: normalizeCsvList(body?.assignees)?.toLowerCase() || '',
    status: normalizeText(body?.status)?.toLowerCase() || '',
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
    const cacheKey = `${auth.user.username}:${activeWorkspace?.workspace_id || 'none'}:projects`;

    if (!noCache) {
      const cached = projectsCache[cacheKey];
      if (cached && Date.now() - cached.ts < PROJECTS_CACHE_TTL) {
        return NextResponse.json({ success: true, data: cached.data, activeWorkspace: cached.activeWorkspace }, {
          headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=25' }
        });
      }
    }

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

    projectsCache[cacheKey] = { ts: Date.now(), data: projects, activeWorkspace };
    return NextResponse.json({ success: true, data: projects, activeWorkspace }, {
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
    const fingerprint = getProjectCreateFingerprint(auth.user.username, activeWorkspace?.workspace_id, body);
    cleanupRecentProjectCreates();

    const existing = recentProjectCreates.get(fingerprint);
    if (existing?.response) {
      return NextResponse.json({ ...existing.response, duplicatePrevented: true });
    }
    if (existing?.promise) {
      const inFlightResult = await existing.promise;
      return NextResponse.json({ ...inFlightResult, duplicatePrevented: true }, { status: inFlightResult.success ? 200 : 400 });
    }

    const createPromise = ProjectModel.create({
      ...body,
      workspace_id: activeWorkspace?.workspace_id || null,
      created_by_id: auth.user.id
    }, getAuditActor(auth.user));
    recentProjectCreates.set(fingerprint, { ts: Date.now(), promise: createPromise });

    const result = await createPromise;
    recentProjectCreates.set(fingerprint, { ts: Date.now(), response: result });

    if (result.success) {
      Object.keys(projectsCache).forEach((key) => {
        if (key.startsWith(`${auth.user.username}:`)) delete projectsCache[key];
      });
      return NextResponse.json({ success: true, id: result.id });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
