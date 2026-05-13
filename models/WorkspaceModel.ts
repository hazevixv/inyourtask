import { query } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { generateId, slugify } from '@/lib/utils';
import crypto from 'crypto';

export type WorkspaceType = 'personal' | 'team' | 'company';
export type WorkspaceMemberRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface Workspace extends RowDataPacket {
  id: number;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  type: WorkspaceType;
  owner_username: string | null;
  created_by: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember extends RowDataPacket {
  id: number;
  workspace_id: string;
  username: string;
  role: WorkspaceMemberRole;
  is_primary: boolean;
  joined_at: Date;
  joined_by: string | null;
}

export interface WorkspaceInvite extends RowDataPacket {
  id: number;
  invite_code: string;
  workspace_id: string;
  email: string | null;
  role: WorkspaceMemberRole;
  invited_by: string;
  expires_at: Date | null;
  accepted_by: string | null;
  accepted_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceListItem {
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  type: WorkspaceType;
  role: WorkspaceMemberRole;
  is_primary: boolean;
  is_active: boolean;
  created_at: Date;
}

function normalizeWorkspaceName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'Personal Workspace';
}

function roleFromUser(user: { role?: string | null }): WorkspaceMemberRole {
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return 'owner';
  return 'member';
}

export class WorkspaceModel {
  static async generateWorkspaceId(): Promise<string> {
    const rows = await query<Array<{ workspace_id: string }>>(
      `SELECT workspace_id
       FROM workspaces
       WHERE workspace_id LIKE 'WS-%'
       ORDER BY CAST(SUBSTRING(workspace_id, 4) AS UNSIGNED) DESC
       LIMIT 1`
    );
    const currentMax = rows[0]?.workspace_id ? Number(rows[0].workspace_id.replace('WS-', '')) : 0;
    return `WS-${String(currentMax + 1).padStart(3, '0')}`;
  }

  static async getUserWorkspaces(username: string): Promise<WorkspaceListItem[]> {
    return await query<WorkspaceListItem[]>(`
      SELECT
        w.workspace_id,
        w.slug,
        w.name,
        w.description,
        w.type,
        wm.role,
        wm.is_primary,
        w.is_active,
        w.created_at
      FROM workspace_members wm
      JOIN workspaces w ON w.workspace_id = wm.workspace_id
      WHERE wm.username = ? AND w.is_active = 1
      ORDER BY wm.is_primary DESC, w.created_at ASC, w.name ASC
    `, [username]);
  }

  static async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    const rows = await query<Workspace[]>(
      'SELECT * FROM workspaces WHERE workspace_id = ? AND is_active = 1',
      [workspaceId]
    );
    return rows[0] || null;
  }

  static async getUserPrimaryWorkspace(username: string): Promise<WorkspaceListItem | null> {
    const rows = await this.getUserWorkspaces(username);
    return rows[0] || null;
  }

  static async resolveActiveWorkspace(username: string, preferredWorkspaceId?: string | null): Promise<WorkspaceListItem | null> {
    const workspaces = await this.getUserWorkspaces(username);
    if (workspaces.length === 0) return null;

    if (preferredWorkspaceId) {
      const preferred = workspaces.find(ws => ws.workspace_id === preferredWorkspaceId);
      if (preferred) return preferred;
    }

    return workspaces.find(ws => ws.is_primary) || workspaces[0];
  }

  static async getWorkspaceMemberUsernames(workspaceId: string): Promise<string[]> {
    const rows = await query<Array<{ username: string }>>(
      'SELECT username FROM workspace_members WHERE workspace_id = ?',
      [workspaceId]
    );
    return rows.map(row => row.username);
  }

  static async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return await query<WorkspaceMember[]>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? ORDER BY is_primary DESC, joined_at ASC',
      [workspaceId]
    );
  }

  static async ensureUserWorkspace(user: {
    username: string;
    full_name?: string | null;
    organization?: string | null;
  }): Promise<WorkspaceListItem | null> {
    const existing = await this.getUserWorkspaces(user.username);
    if (existing.length > 0) return existing[0];

    const fullName = String(user.full_name || '').trim();
    const workspaceName = fullName || `${user.username}'s Workspace`;
    const workspaceType: WorkspaceType = 'personal';

    const created = await this.createWorkspaceForUser({
      username: user.username,
      fullName: fullName || null,
      workspaceName,
      workspaceType,
      createdBy: user.username
    });

    if (!created.success || !created.workspace) return null;
    return await this.getUserPrimaryWorkspace(user.username);
  }

  static async createWorkspace(params: {
    name: string;
    type?: WorkspaceType;
    description?: string | null;
    ownerUsername: string;
    createdBy?: string;
    slug?: string;
  }): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
    try {
      const name = normalizeWorkspaceName(params.name);
      const workspaceId = await this.generateWorkspaceId();
      const baseSlug = slugify(params.slug || name);
      let slug = baseSlug;
      let suffix = 2;

      while (true) {
        const existing = await query<Array<{ slug: string }>>(
          'SELECT slug FROM workspaces WHERE slug = ? LIMIT 1',
          [slug]
        );
        if (existing.length === 0) break;
        slug = `${baseSlug}-${suffix++}`;
      }

      await query<ResultSetHeader>(`
        INSERT INTO workspaces (
          workspace_id, slug, name, description, type, owner_username, created_by, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        workspaceId,
        slug,
        name,
        params.description || null,
        params.type || 'team',
        params.ownerUsername,
        params.createdBy || params.ownerUsername
      ]);

      const workspace = await this.getWorkspaceById(workspaceId);
      return { success: true, workspace: workspace || undefined };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async addMember(params: {
    workspaceId: string;
    username: string;
    role?: WorkspaceMemberRole;
    isPrimary?: boolean;
    joinedBy?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(`
        INSERT INTO workspace_members (
          workspace_id, username, role, is_primary, joined_by
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          role = VALUES(role),
          is_primary = VALUES(is_primary),
          joined_by = COALESCE(VALUES(joined_by), joined_by)
      `, [
        params.workspaceId,
        params.username,
        params.role || 'member',
        params.isPrimary ? 1 : 0,
        params.joinedBy || null
      ]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getWorkspaceMember(workspaceId: string, username: string): Promise<WorkspaceMember | null> {
    const rows = await query<WorkspaceMember[]>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND username = ? LIMIT 1',
      [workspaceId, username]
    );
    return rows[0] || null;
  }

  static async isWorkspaceAdmin(workspaceId: string, username: string): Promise<boolean> {
    const member = await this.getWorkspaceMember(workspaceId, username);
    return !!member && (member.role === 'owner' || member.role === 'admin');
  }

  static async ensurePrimaryMember(workspaceId: string, username: string): Promise<void> {
    await query<ResultSetHeader>(
      'UPDATE workspace_members SET is_primary = 0 WHERE username = ?',
      [username]
    );
    await query<ResultSetHeader>(
      'UPDATE workspace_members SET is_primary = 1 WHERE workspace_id = ? AND username = ?',
      [workspaceId, username]
    );
  }

  static async createInvite(params: {
    workspaceId: string;
    invitedBy: string;
    role?: WorkspaceMemberRole;
    email?: string | null;
    expiresAt?: Date | null;
  }): Promise<{ success: boolean; invite?: WorkspaceInvite; error?: string }> {
    try {
      let inviteCode = `INV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      while (true) {
        const existing = await query<Array<{ invite_code: string }>>(
          'SELECT invite_code FROM workspace_invites WHERE invite_code = ? LIMIT 1',
          [inviteCode]
        );
        if (existing.length === 0) break;
        inviteCode = `INV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      }

      await query<ResultSetHeader>(`
        INSERT INTO workspace_invites (
          invite_code, workspace_id, email, role, invited_by, expires_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [
        inviteCode,
        params.workspaceId,
        params.email || null,
        params.role || 'member',
        params.invitedBy,
        params.expiresAt || null
      ]);

      const rows = await query<WorkspaceInvite[]>(
        'SELECT * FROM workspace_invites WHERE invite_code = ? LIMIT 1',
        [inviteCode]
      );
      return { success: true, invite: rows[0] || undefined };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getInviteByCode(inviteCode: string): Promise<WorkspaceInvite | null> {
    const rows = await query<WorkspaceInvite[]>(
      'SELECT * FROM workspace_invites WHERE invite_code = ? LIMIT 1',
      [inviteCode]
    );
    return rows[0] || null;
  }

  static async getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    return await query<WorkspaceInvite[]>(
      `SELECT *
       FROM workspace_invites
       WHERE workspace_id = ?
       ORDER BY is_active DESC, created_at DESC`,
      [workspaceId]
    );
  }

  static async acceptInvite(params: {
    inviteCode: string;
    username: string;
    acceptedBy?: string;
  }): Promise<{ success: boolean; workspace?: WorkspaceListItem | null; error?: string }> {
    try {
      const invite = await this.getInviteByCode(params.inviteCode);
      if (!invite || !invite.is_active) {
        return { success: false, error: 'Invite not found or already used' };
      }

      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return { success: false, error: 'Invite has expired' };
      }

      await this.addMember({
        workspaceId: invite.workspace_id,
        username: params.username,
        role: invite.role,
        isPrimary: true,
        joinedBy: params.acceptedBy || params.username
      });

      await query<ResultSetHeader>(
        `UPDATE workspace_invites
         SET accepted_by = ?, accepted_at = NOW(), is_active = 0
         WHERE invite_code = ?`,
        [params.acceptedBy || params.username, params.inviteCode]
      );

      await this.ensurePrimaryMember(invite.workspace_id, params.username);
      const workspace = await this.resolveWorkspaceListItem(invite.workspace_id, params.username);
      return { success: true, workspace };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async resolveWorkspaceListItem(workspaceId: string, username: string): Promise<WorkspaceListItem | null> {
    const rows = await query<WorkspaceListItem[]>(`
      SELECT
        w.workspace_id,
        w.slug,
        w.name,
        w.description,
        w.type,
        wm.role,
        wm.is_primary,
        w.is_active,
        w.created_at
      FROM workspace_members wm
      JOIN workspaces w ON w.workspace_id = wm.workspace_id
      WHERE wm.workspace_id = ? AND wm.username = ? AND w.is_active = 1
      LIMIT 1
    `, [workspaceId, username]);
    return rows[0] || null;
  }

  static async createWorkspaceForUser(params: {
    username: string;
    fullName?: string | null;
    workspaceName?: string | null;
    workspaceType?: WorkspaceType;
    createdBy?: string;
  }): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
    const origin = params.workspaceType === 'team' ? `${params.username}'s Team` : (params.fullName || `${params.username}'s Workspace`);
    const workspaceName = normalizeWorkspaceName(params.workspaceName || origin);
    const workspaceType = params.workspaceType || (params.workspaceName ? 'team' : 'personal');
    const created = await this.createWorkspace({
      name: workspaceName,
      type: workspaceType,
      ownerUsername: params.username,
      createdBy: params.createdBy || params.username
    });

    if (!created.success || !created.workspace) return created;

    const memberResult = await this.addMember({
      workspaceId: created.workspace.workspace_id,
      username: params.username,
      role: 'owner',
      isPrimary: true,
      joinedBy: params.createdBy || params.username
    });

    if (!memberResult.success) {
      return { success: false, error: memberResult.error || 'Failed to add workspace member' };
    }

    await this.ensurePrimaryMember(created.workspace.workspace_id, params.username);
    await this.ensureWorkspaceDefaultAgents(created.workspace.workspace_id, params.username);

    return created;
  }

  static async ensureWorkspaceDefaultAgents(workspaceId: string, createdBy: string = 'system'): Promise<void> {
    const existing = await query<any[]>(
      'SELECT COUNT(*) as cnt FROM ai_agents WHERE workspace_id = ? AND is_personal = 0',
      [workspaceId]
    );
    if ((existing[0]?.cnt || 0) > 0) return;

    const templates = await query<any[]>(`
      SELECT *
      FROM ai_agents
      WHERE workspace_id IS NULL AND is_personal = 0 AND is_active = 1
      ORDER BY id ASC
    `);

    for (const template of templates) {
      const agentId = `ws-${workspaceId}-${template.agent_id}`.slice(0, 50);
      await query(`
        INSERT INTO ai_agents (
          agent_id, workspace_id, name, description, avatar, role, system_prompt, knowledge_base,
          model, is_active, is_personal, owner_username, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        agentId,
        workspaceId,
        template.name,
        template.description || null,
        template.avatar || null,
        template.role || null,
        template.system_prompt,
        template.knowledge_base || null,
        template.model || 'openai/gpt-oss-20b',
        template.is_active ?? 1,
        0,
        null,
        createdBy
      ]);

      const assignments = await query<any[]>(
        'SELECT role_name FROM agent_role_assignments WHERE agent_id = ?',
        [template.agent_id]
      );
      for (const assignment of assignments) {
        await query(
          'INSERT IGNORE INTO agent_role_assignments (agent_id, role_name, assigned_by) VALUES (?, ?, ?)',
          [agentId, assignment.role_name, createdBy]
        );
      }
    }
  }

  static roleFromUser = roleFromUser;
}

export function workspaceRoleFromUser(user: { role?: string | null }): WorkspaceMemberRole {
  return roleFromUser(user);
}
