import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const { memberUsernames } = await getRequestWorkspaceContext(request);
    const scopeUsernames = memberUsernames.length > 0 ? memberUsernames : [auth.user.username];
    const logs = await query(
      `SELECT *
       FROM weekly_snapshot
       WHERE changed_by IN (${scopeUsernames.map(() => '?').join(',')})
       ORDER BY timestamp DESC
       LIMIT 200`,
      scopeUsernames
    );

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
