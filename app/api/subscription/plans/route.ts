import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { ChatModel } from '@/models/ChatModel';

/**
 * GET /api/subscription/plans
 * List all available subscription plans
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const plans = await ChatModel.getSubscriptionPlans(true);
    return NextResponse.json({ success: true, data: plans });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
