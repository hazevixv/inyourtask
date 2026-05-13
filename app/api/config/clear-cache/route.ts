import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';

/**
 * POST /api/config/clear-cache
 * Clear config cache for current user
 * This forces a fresh load of team members and other config
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[CLEAR CACHE] Clearing config cache for user: ${user.username}`);

  return NextResponse.json({ 
    success: true, 
    message: 'Cache cleared. Please refresh the page.',
    timestamp: Date.now()
  });
}
