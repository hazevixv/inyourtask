import { query } from './db';

export async function autoAssignTeamMembers(
  itemType: 'project' | 'task',
  itemId: string,
  division: string,
  createdBy: string
): Promise<void> {
  // Only add creator as owner
  await query(
    `INSERT IGNORE INTO team_members (item_type, item_id, username, role, added_by)
     VALUES (?, ?, ?, 'owner', ?)`,
    [itemType, itemId, createdBy, createdBy]
  );
}
