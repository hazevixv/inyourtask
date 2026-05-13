import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { ChatModel } from '@/models/ChatModel';

/**
 * GET /api/super-admin/subscription-plans
 * List all subscription plans (including inactive)
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const plans = await ChatModel.getSubscriptionPlans(false);
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/subscription-plans
 * Create a new subscription plan
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const plan = await ChatModel.createSubscriptionPlan(body);
    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
