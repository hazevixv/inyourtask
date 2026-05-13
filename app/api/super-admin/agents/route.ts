import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { query } from '@/lib/db';
import { ChatModel } from '@/models/ChatModel';

function normalizeAccessType(value: any): 'free' | 'subscription' | 'code' {
  const normalized = String(value || 'free').trim().toLowerCase();
  if (normalized === 'subscription') return 'subscription';
  if (normalized === 'code' || normalized === 'code-based' || normalized === 'code_based') return 'code';
  return 'free';
}

/**
 * GET /api/super-admin/agents
 * List all Worker AI agents (superadmin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includePersonal = searchParams.get('include_personal') === '1';

    let agents: any[];
    const baseQuery = `
      SELECT a.*, u.full_name as owner_name, sp.name as plan_name,
        (SELECT COUNT(*) FROM agent_role_assignments ara WHERE ara.agent_id = a.agent_id) AS role_count,
        (SELECT COUNT(*) FROM user_agent_assignments uaa WHERE uaa.agent_id = a.agent_id) AS assigned_user_count
      FROM ai_agents a
      LEFT JOIN users u ON u.username = a.owner_username
      LEFT JOIN subscription_plans sp ON sp.id = a.subscription_plan_id
    `;

    if (includePersonal) {
      agents = await query<any[]>(`${baseQuery} ORDER BY a.created_at DESC`);
    } else {
      agents = await query<any[]>(
        `${baseQuery} WHERE a.is_personal = 0 ORDER BY a.created_at DESC`
      );
    }

    return NextResponse.json({ success: true, data: agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/agents
 * Create a new Worker AI agent (superadmin only)
 * Body: { name, description, system_prompt, model, access_type, subscription_plan_id, agent_code, is_public, max_activations }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const systemPrompt = String(body.system_prompt || '').trim() || 'Kamu adalah asisten AI yang membantu user mengelola task dan project.';
    const model = String(body.model || '').trim() || process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
    const accessType = normalizeAccessType(body.access_type);
    const isPublic = body.is_public ? 1 : 0;
    const maxActivations = Number.isFinite(Number(body.max_activations)) ? Number(body.max_activations) : -1;
    const subscriptionPlanId = accessType === 'subscription'
      ? (body.subscription_plan_id ? Number(body.subscription_plan_id) : null)
      : null;
    const agentCode = accessType === 'code'
      ? String(body.agent_code || '').trim() || null
      : null;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (accessType === 'subscription' && !subscriptionPlanId) {
      return NextResponse.json({ success: false, error: 'Subscription worker requires a plan' }, { status: 400 });
    }
    if (accessType === 'code' && !agentCode) {
      return NextResponse.json({ success: false, error: 'Code-based worker requires an activation code' }, { status: 400 });
    }

    const agentId = 'sa-worker-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    const avatarPrompt = body.avatar_prompt || null;

    await query(
      `INSERT INTO ai_agents (agent_id, workspace_id, name, description, system_prompt, model, is_personal, access_type, subscription_plan_id, is_public, agent_code, max_activations, created_by, is_active, avatar_prompt)
       VALUES (?, NULL, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [agentId, name, description || null, systemPrompt, model, accessType, subscriptionPlanId, isPublic, agentCode || null, maxActivations, auth.user.username, avatarPrompt]
    );

    const agents = await query<any[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]);
    return NextResponse.json({ success: true, data: agents[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/super-admin/agents
 * Update a Worker AI agent (superadmin only)
 */
export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { agent_id, name, description, system_prompt, model, access_type, subscription_plan_id, is_public, agent_code, max_activations, is_active } = body;

    if (!agent_id) {
      return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });
    }

    const normalizedAccessType = access_type !== undefined ? normalizeAccessType(access_type) : undefined;
    const normalizedPlanId = normalizedAccessType === 'subscription'
      ? (subscription_plan_id ? Number(subscription_plan_id) : null)
      : undefined;
    const normalizedAgentCode = normalizedAccessType === 'code'
      ? String(agent_code || '').trim() || null
      : undefined;
    const normalizedMaxActivations = max_activations !== undefined && max_activations !== null && String(max_activations).trim() !== ''
      ? Number(max_activations)
      : undefined;

    if (normalizedAccessType === 'subscription' && normalizedPlanId == null) {
      return NextResponse.json({ success: false, error: 'Subscription worker requires a plan' }, { status: 400 });
    }
    if (normalizedAccessType === 'code' && !normalizedAgentCode) {
      return NextResponse.json({ success: false, error: 'Code-based worker requires an activation code' }, { status: 400 });
    }

    const fields: string[] = [];
    const vals: any[] = [];
    if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
    if (description !== undefined) { fields.push('description = ?'); vals.push(description); }
    if (system_prompt !== undefined) { fields.push('system_prompt = ?'); vals.push(system_prompt); }
    if (model !== undefined) { fields.push('model = ?'); vals.push(model); }
    if (body.avatar_prompt !== undefined) { fields.push('avatar_prompt = ?'); vals.push(body.avatar_prompt || null); }
    if (normalizedAccessType !== undefined) { fields.push('access_type = ?'); vals.push(normalizedAccessType); }
    if (normalizedAccessType !== undefined) { fields.push('subscription_plan_id = ?'); vals.push(normalizedPlanId ?? null); }
    if (is_public !== undefined) { fields.push('is_public = ?'); vals.push(is_public ? 1 : 0); }
    if (normalizedAccessType !== undefined) { fields.push('agent_code = ?'); vals.push(normalizedAgentCode ?? null); }
    if (normalizedMaxActivations !== undefined) { fields.push('max_activations = ?'); vals.push(normalizedMaxActivations); }
    if (is_active !== undefined) { fields.push('is_active = ?'); vals.push(is_active ? 1 : 0); }

    if (!fields.length) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = NOW()');
    vals.push(agent_id);
    await query(`UPDATE ai_agents SET ${fields.join(', ')} WHERE agent_id = ?`, vals);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/super-admin/agents
 * Delete a Worker AI agent (superadmin only)
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    if (!agent_id) {
      return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });
    }

    await query('DELETE FROM user_agent_assignments WHERE agent_id = ?', [agent_id]);
    await query('DELETE FROM ai_agent_memory WHERE agent_id = ?', [agent_id]);
    await query('UPDATE chat_conversations SET is_archived = 1 WHERE agent_id = ?', [agent_id]);
    await query('DELETE FROM ai_agents WHERE agent_id = ?', [agent_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
