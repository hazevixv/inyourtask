import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';

/**
 * GET /api/hierarchy/divisions
 * Divisions system has been removed (legacy).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, divisions: [] });
}
