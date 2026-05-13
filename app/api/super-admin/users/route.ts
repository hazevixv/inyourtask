import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response as NextResponse;
  const user = auth.user as any;
  
  if (!isPlatformSuperAdminUser(user)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await query<any[]>('SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}