import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

async function resolveCompanyNameFromPath(path?: string | null, fallbackOrganization?: string | null, workspaceId?: string | null) {
  const fallbackCompany = await query<any[]>(workspaceId ? `
    SELECT unit_name
    FROM organizational_units
    WHERE unit_type = 'company' AND is_active = 1 AND workspace_id = ?
    ORDER BY level ASC, id ASC
    LIMIT 1
  ` : `
    SELECT unit_name
    FROM organizational_units
    WHERE unit_type = 'company' AND is_active = 1
    ORDER BY level ASC, id ASC
    LIMIT 1
  `, workspaceId ? [workspaceId] : []);

  const fallbackName = fallbackOrganization || fallbackCompany[0]?.unit_name || 'Unknown Company';
  const pathParts = String(path || '').split('/').filter((part) => part.trim() !== '');
  if (pathParts.length === 0) return fallbackName;

  const placeholders = pathParts.map(() => '?').join(',');
  const pathUnits = await query<any[]>(workspaceId ? `
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
      AND workspace_id = ?
      AND (unit_code IN (${placeholders}) OR id IN (${placeholders}))
  ` : `
    SELECT id, unit_code, unit_name, unit_type, level
    FROM organizational_units
    WHERE is_active = 1
      AND (unit_code IN (${placeholders}) OR id IN (${placeholders}))
  `, workspaceId ? [workspaceId, ...pathParts, ...pathParts] : [...pathParts, ...pathParts]);

  const byCode = new Map(pathUnits.map((unit) => [String(unit.unit_code), unit]));
  const byId = new Map(pathUnits.map((unit) => [String(unit.id), unit]));
  const orderedUnits = pathParts
    .map((part) => byCode.get(part) || byId.get(part))
    .filter(Boolean);

  const companyUnit =
    [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) > 0) ||
    [...orderedUnits].reverse().find((unit) => unit.unit_type === 'company' && Number(unit.level) === 0);
  return companyUnit?.unit_name || fallbackName;
}

/**
 * POST /api/admin/sync-primary-info
 * Sync job_position and organization for ALL users based on their primary assignments
 * Run this once to fix existing users
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    // Get all users with primary assignments
    const usersWithPrimary = activeWorkspaceId ? await query<any[]>(`
      SELECT DISTINCT
        ous.username,
        ou.unit_name,
        ou.path,
        ou.unit_type,
        ou.workspace_id,
        u.organization
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      JOIN users u ON u.username = ous.username
      WHERE ous.is_primary = TRUE AND ou.is_active = 1 AND ou.workspace_id = ?
    `, [activeWorkspaceId]) : [];

    console.log(`[SYNC] Found ${usersWithPrimary.length} users with primary assignments`);

    let successCount = 0;
    const results: any[] = [];

    for (const u of usersWithPrimary) {
      try {
        const companyName = await resolveCompanyNameFromPath(u.path, u.organization, u.workspace_id);

        await query(
          'UPDATE users SET job_position = ?, organization = ? WHERE username = ?',
          [u.unit_name, companyName, u.username]
        );

        results.push({ username: u.username, job_position: u.unit_name, organization: companyName });
        successCount++;
        console.log(`[SYNC] ✅ ${u.username}: job_position="${u.unit_name}", organization="${companyName}"`);
      } catch (err) {
        console.error(`[SYNC] ❌ Error for ${u.username}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} users successfully`,
      results
    });
  } catch (e: any) {
    console.error('[SYNC] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
