import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/hierarchy/team-members?item_type=project&item_id=xxx
 * Get team members for a project or task
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const item_type = searchParams.get('item_type');
  const item_id = searchParams.get('item_id');

  if (!item_type || !item_id) {
    return NextResponse.json({ success: false, error: 'item_type and item_id required' }, { status: 400 });
  }

  try {
    const members = await query<any[]>(`
      SELECT 
        tm.*,
        u.full_name,
        u.avatar
      FROM team_members tm
      JOIN users u ON u.username = tm.username
      WHERE tm.item_type = ? AND tm.item_id = ?
      ORDER BY 
        FIELD(tm.role, 'owner', 'pic', 'member'),
        u.full_name ASC
    `, [item_type, item_id]);

    return NextResponse.json({ success: true, members });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/hierarchy/team-members
 * Add team member(s) to project or task
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { item_type, item_id, usernames, role } = await req.json();

    if (!item_type || !item_id || !usernames || !Array.isArray(usernames)) {
      return NextResponse.json({ success: false, error: 'item_type, item_id, and usernames array required' }, { status: 400 });
    }

    // Add each member
    for (const username of usernames) {
      await query(
        `INSERT INTO team_members (item_type, item_id, username, role, added_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role = VALUES(role), added_by = VALUES(added_by), added_at = NOW()`,
        [item_type, item_id, username, role || 'member', user.username]
      );
    }

    return NextResponse.json({ success: true, message: `Added ${usernames.length} team member(s)` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/hierarchy/team-members?item_type=project&item_id=xxx&username=yyy
 * Remove team member from project or task
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const item_type = searchParams.get('item_type');
  const item_id = searchParams.get('item_id');
  const username = searchParams.get('username');

  if (!item_type || !item_id || !username) {
    return NextResponse.json({ success: false, error: 'item_type, item_id, and username required' }, { status: 400 });
  }

  try {
    await query(
      'DELETE FROM team_members WHERE item_type = ? AND item_id = ? AND username = ?',
      [item_type, item_id, username]
    );

    return NextResponse.json({ success: true, message: 'Team member removed' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
