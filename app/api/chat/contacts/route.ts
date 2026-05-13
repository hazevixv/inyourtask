import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * GET /api/chat/contacts
 * Returns contacts for the current workspace.
 */
export async function GET(req: NextRequest) {
  const { user, activeWorkspace, memberUsernames } = await getRequestWorkspaceContext(req);
  if (!user || !activeWorkspace) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaceMembers = memberUsernames.filter(username => username !== user.username);

    const members = workspaceMembers.length > 0
      ? await query<any[]>(`
          SELECT u.username, u.full_name, u.avatar, u.job_position, u.email, u.organization
          FROM users u
          WHERE u.username IN (${workspaceMembers.map(() => '?').join(',')}) AND u.is_active = 1
          ORDER BY u.full_name ASC
        `, workspaceMembers)
      : [];

    const contacts = members.map(m => ({
      username: m.username,
      full_name: m.full_name,
      avatar: m.avatar,
      job_position: m.job_position,
      email: m.email,
      units: activeWorkspace.name
    }));

    const groupChats = await query<any[]>(`
      SELECT c.conv_id, c.name, c.avatar, c.last_message, c.last_msg_at,
        (SELECT COUNT(*) FROM chat_members WHERE conv_id = c.conv_id) as member_count
      FROM chat_conversations c
      WHERE c.type = 'group'
        AND c.workspace_id = ?
        AND c.conv_id IN (SELECT conv_id FROM chat_members WHERE username = ?)
        AND c.is_archived = 0
      ORDER BY COALESCE(c.last_msg_at, c.created_at) DESC
    `, [activeWorkspace.workspace_id, user.username]);

    return NextResponse.json({
      success: true,
      contacts,
      groups: [{
        org_unit_id: activeWorkspace.workspace_id,
        unit_name: activeWorkspace.name,
        unit_type: activeWorkspace.type,
        unit_color: '#7c3aed',
        is_primary: true,
        members: contacts
      }],
      groupChats
    });
  } catch (e: any) {
    console.error('[chat/contacts]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
