import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { ChatModel } from '@/models/ChatModel';

/**
 * GET /api/subscription/my
 * Get current user's active subscription
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const subscription = await ChatModel.getUserActiveSubscription(user.username);
    return NextResponse.json({ success: true, data: subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
