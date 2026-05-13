import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
