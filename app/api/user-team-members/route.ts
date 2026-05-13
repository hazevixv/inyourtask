import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/user-team-members
 * Get team members based on logged-in user's organizational assignments
 * Returns all members from units where the user is assigned
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all organizational units where this user is assigned
    const userUnits = await query<any[]>(`
      SELECT DISTINCT org_unit_id
      FROM org_unit_staff
      WHERE username = ?
    `, [user.username]);

    if (userUnits.length === 0) {
      // User has no organizational assignments, return empty list
      return NextResponse.json({ success: true, members: [] });
    }

    const unitIds = userUnits.map(u => u.org_unit_id);

    // Get all team members from these units (excluding the current user)
    const teamMembers = await query<any[]>(`
      SELECT DISTINCT
        ous.username,
        u.full_name,
        u.job_position,
        u.avatar,
        u.email,
        GROUP_CONCAT(DISTINCT ou.unit_name ORDER BY ou.unit_name SEPARATOR ', ') as units
      FROM org_unit_staff ous
      JOIN users u ON ous.username = u.username
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.org_unit_id IN (${unitIds.map(() => '?').join(',')})
        AND u.is_active = 1
        AND ous.username != ?
      GROUP BY ous.username, u.full_name, u.job_position, u.avatar, u.email
      ORDER BY u.full_name ASC
    `, [...unitIds, user.username]);

    console.log(`[user-team-members] User ${user.username} has ${teamMembers.length} team members from ${unitIds.length} units`);

    return NextResponse.json({ 
      success: true, 
      members: teamMembers.map(m => ({
        value: m.username,
        full_name: m.full_name,
        job_position: m.job_position,
        avatar: m.avatar,
        email: m.email,
        units: m.units
      }))
    });
  } catch (e: any) {
    console.error('[user-team-members GET]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
