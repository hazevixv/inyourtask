import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { ChatModel } from '@/models/ChatModel';

/**
 * POST /api/subscription/activate
 * Activate a subscription plan for the current user
 * Body: { plan_id, payment_method, payment_ref }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const planId = parseInt(body.plan_id);
    if (!planId) {
      return NextResponse.json({ success: false, error: 'plan_id required' }, { status: 400 });
    }

    const plan = await ChatModel.getSubscriptionPlanById(planId);
    if (!plan || !plan.is_active) {
      return NextResponse.json({ success: false, error: 'Plan not found or inactive' }, { status: 400 });
    }

    const subscription = await ChatModel.activateUserSubscription(
      user.username,
      planId,
      body.payment_method || null,
      body.payment_ref || null
    );

    return NextResponse.json({ success: true, data: subscription });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
