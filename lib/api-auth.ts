import { NextRequest, NextResponse } from 'next/server';
import { AuthModel, type User } from '@/models/AuthModel';

export async function requireUser(request: NextRequest): Promise<
  | { user: User }
  | { response: NextResponse }
> {
  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    };
  }

  const result = await AuthModel.verifySession(token);
  if (!result.success || !result.user) {
    return {
      response: NextResponse.json(
        { success: false, error: result.error || 'Invalid session' },
        { status: 401 }
      )
    };
  }

  return { user: result.user };
}

// Returns user or null (no error response)
export async function getSessionUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  const result = await AuthModel.verifySession(token);
  if (!result.success || !result.user) return null;
  return result.user;
}

export function getAuditActor(user?: Partial<User> | null) {
  return user?.full_name || user?.username || 'System';
}
