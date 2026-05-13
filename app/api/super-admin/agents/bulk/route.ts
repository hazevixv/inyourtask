import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { query } from '@/lib/db';

/**
 * POST /api/super-admin/agents/bulk
 * Bulk operations on Worker AI agents
 * Actions: set_public, set_access_type, set_active, bulk_delete
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  if (!isPlatformSuperAdminUser(auth.user as any)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, agent_ids, value } = body;

    if (!action || !agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'action, agent_ids array required' }, { status: 400 });
    }

    const placeholders = agent_ids.map(() => '?').join(',');

    switch (action) {
      case 'set_public': {
        const isPublic = value ? 1 : 0;
        const [result] = await query<any>(
          `UPDATE ai_agents SET is_public = ?, updated_at = NOW() WHERE agent_id IN (${placeholders}) AND is_personal = 0`,
          [isPublic, ...agent_ids]
        );
        return NextResponse.json({ success: true, data: { affected: result.affectedRows } });
      }

      case 'set_access_type': {
        if (!['free', 'subscription', 'code'].includes(value)) {
          return NextResponse.json({ success: false, error: 'access_type must be free/subscription/code' }, { status: 400 });
        }
        const [result] = await query<any>(
          `UPDATE ai_agents SET access_type = ?, updated_at = NOW() WHERE agent_id IN (${placeholders}) AND is_personal = 0`,
          [value, ...agent_ids]
        );
        return NextResponse.json({ success: true, data: { affected: result.affectedRows } });
      }

      case 'set_active': {
        const isActive = value ? 1 : 0;
        const [result] = await query<any>(
          `UPDATE ai_agents SET is_active = ?, updated_at = NOW() WHERE agent_id IN (${placeholders}) AND is_personal = 0`,
          [isActive, ...agent_ids]
        );
        return NextResponse.json({ success: true, data: { affected: result.affectedRows } });
      }

      case 'bulk_delete': {
        // Clean up related data first
        await query(`DELETE FROM user_agent_assignments WHERE agent_id IN (${placeholders})`, agent_ids);
        await query(`DELETE FROM agent_role_assignments WHERE agent_id IN (${placeholders})`, agent_ids);
        await query(`DELETE FROM ai_agent_memory WHERE agent_id IN (${placeholders})`, agent_ids);
        await query(`UPDATE chat_conversations SET is_archived = 1 WHERE agent_id IN (${placeholders})`, agent_ids);
        const [result] = await query<any>(
          `DELETE FROM ai_agents WHERE agent_id IN (${placeholders}) AND is_personal = 0`,
          agent_ids
        );
        return NextResponse.json({ success: true, data: { deleted: result.affectedRows } });
      }

      case 'set_subscription_plan': {
        const planId = value ? parseInt(value) : null;
        const [result] = await query<any>(
          `UPDATE ai_agents SET subscription_plan_id = ?, updated_at = NOW() WHERE agent_id IN (${placeholders}) AND is_personal = 0`,
          [planId, ...agent_ids]
        );
        return NextResponse.json({ success: true, data: { affected: result.affectedRows } });
      }

      case 'deploy_to_role': {
        // Deploy all selected agents to all users with a specific role
        const roleName = value;
        if (!roleName) {
          return NextResponse.json({ success: false, error: 'role_name required as value' }, { status: 400 });
        }
        // Get all users with this role
        const usersWithRole = await query<any[]>(`
          SELECT DISTINCT username FROM (
            SELECT username FROM users WHERE job_position = ?
            UNION
            SELECT username FROM user_roles WHERE role_name = ?
            UNION
            SELECT ous.username FROM org_unit_staff ous
            JOIN organizational_units ou ON ou.id = ous.org_unit_id
            WHERE ou.unit_name = ? AND ou.is_active = 1
          ) AS role_users
        `, [roleName, roleName, roleName]);

        let assigned = 0;
        for (const agentId of agent_ids) {
          for (const u of usersWithRole) {
            try {
              await query(
                `INSERT IGNORE INTO user_agent_assignments (agent_id, username, access_type, is_approved, assigned_by, assigned_at, is_active)
                 VALUES (?, ?, 'free', 1, ?, NOW(), 1)`,
                [agentId, u.username, auth.user.username]
              );
              assigned++;
            } catch { /* skip */ }
          }
        }
        return NextResponse.json({
          success: true,
          data: { agents: agent_ids.length, users: usersWithRole.length, assignments_created: assigned }
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
