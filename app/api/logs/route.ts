import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';
import { query } from '@/lib/db';

const logsCache: Record<string, { ts: number; data: any[] }> = {};
const LOGS_CACHE_TTL = 15_000;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const { activeWorkspace, memberUsernames } = await getRequestWorkspaceContext(request);
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.get('nocache') === '1';
    const cacheKey = `${auth.user.username}:${activeWorkspace?.workspace_id || 'none'}:logs`;

    if (!noCache) {
      const cached = logsCache[cacheKey];
      if (cached && Date.now() - cached.ts < LOGS_CACHE_TTL) {
        return NextResponse.json({ success: true, data: cached.data }, {
          headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=25' }
        });
      }
    }

    const scopeUsernames = memberUsernames.length > 0 ? memberUsernames : [auth.user.username];
    const logs = await query(
      `SELECT *
       FROM weekly_snapshot
       WHERE changed_by IN (${scopeUsernames.map(() => '?').join(',')})
       ORDER BY timestamp DESC
       LIMIT 200`,
      scopeUsernames
    );

    logsCache[cacheKey] = { ts: Date.now(), data: logs as any[] };
    return NextResponse.json({ success: true, data: logs }, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=25' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
