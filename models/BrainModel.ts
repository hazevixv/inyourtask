import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { normalizeText } from '@/lib/normalizers';
import {
  getCanonicalTaskPriorities,
  getLegacyTaskPriorityMappings,
  isCanonicalTaskPriority,
  normalizeTaskPriority
} from '@/lib/task-priority';

export interface BrainConfig extends RowDataPacket {
  id: number;
  config_type: 'team' | 'status' | 'priority' | 'progress' | 'category';
  config_value: string;
  category_tag?: string | null; // Tag for categories: Perusahaan, Unit Bisnis, Brand, Produk, Lainnya
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BrainDefault extends RowDataPacket {
  id: number;
  default_key: string;
  default_value: string;
  updated_at: Date;
}

export class BrainModel {
  static readonly defaultTypeMap = {
    default_category: 'category',
    default_status: 'status',
    default_priority: 'priority',
    default_progress: 'progress'
  } as const;

  private static priorityIntegrityPromise: Promise<void> | null = null;
  private static lastPriorityIntegrityAt = 0;

  private static mapMemberRow(row: any) {
    const sharedUnits = typeof row.shared_units === 'string'
      ? row.shared_units.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];
    const workspaceLabel = row.workspace_name || row.workspace_label || 'Workspace';

    return {
      value: row.username,
      username: row.username,
      full_name: row.full_name,
      job_position: row.primary_unit_name || row.job_position || workspaceLabel,
      avatar: row.avatar,
      organization: row.primary_unit_name || workspaceLabel,
      unit_name: row.primary_unit_name || sharedUnits[0] || row.job_position || workspaceLabel,
      shared_units: sharedUnits,
      team_role: row.team_role || null
    };
  }

  private static async getWorkspaceMembers(username?: string): Promise<any[]> {
    const allMembersQuery = `
      SELECT
        u.username,
        u.full_name,
        u.job_position,
        u.avatar,
        u.organization,
        COALESCE((
          SELECT w.name
          FROM workspaces w
          JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
          WHERE wm.username = u.username AND w.is_active = 1
          ORDER BY wm.is_primary DESC, w.created_at ASC
          LIMIT 1
        ), 'Workspace') AS workspace_name,
        (
          SELECT ou.unit_name
          FROM org_unit_staff ous2
          JOIN organizational_units ou ON ou.id = ous2.org_unit_id
          WHERE ous2.username = u.username AND ou.is_active = 1
          ORDER BY ous2.is_primary DESC, ou.level ASC, ou.unit_name ASC
          LIMIT 1
        ) AS primary_unit_name
      FROM users u
      WHERE u.is_active = 1
      ORDER BY ${username ? 'CASE WHEN u.username = ? THEN 0 ELSE 1 END,' : ''} u.full_name ASC, u.username ASC
    `;

    if (username) {
      const members = await query<any[]>(allMembersQuery, [username]);
      return members.map((row) => this.mapMemberRow(row));
    }

    const members = await query<any[]>(allMembersQuery);
    return members.map((row) => this.mapMemberRow(row));
  }

  static isValidType(type: string): type is 'status' | 'priority' | 'progress' | 'category' {
    return ['status', 'priority', 'progress', 'category'].includes(type);
  }

  private static async ensurePriorityIntegrity() {
    const now = Date.now();
    if (this.priorityIntegrityPromise) {
      await this.priorityIntegrityPromise;
      return;
    }

    if (now - this.lastPriorityIntegrityAt < 5 * 60 * 1000) {
      return;
    }

    this.priorityIntegrityPromise = (async () => {
      const canonical = getCanonicalTaskPriorities();
      const legacyMappings = getLegacyTaskPriorityMappings();

      for (const [legacyValue, mappedValue] of Object.entries(legacyMappings)) {
        if (canonical.some((item) => item.toLowerCase() === legacyValue.toLowerCase())) {
          continue;
        }

        await query<ResultSetHeader>(
          'UPDATE tasks SET priority = ? WHERE LOWER(priority) = ?',
          [mappedValue, legacyValue]
        );

        await query<ResultSetHeader>(
          'UPDATE brain_defaults SET default_value = ? WHERE default_key = ? AND LOWER(default_value) = ?',
          [mappedValue, 'default_priority', legacyValue]
        );
      }

      const existingRows = await query<BrainConfig[]>(
        'SELECT id, config_value, display_order, is_active FROM brain_config WHERE config_type = ? ORDER BY display_order ASC, id ASC',
        ['priority']
      );

      for (let index = 0; index < canonical.length; index += 1) {
        const value = canonical[index];
        const matchingRow = existingRows.find((row) => row.config_value?.toLowerCase() === value.toLowerCase());
        const displayOrder = index + 1;

        if (matchingRow) {
          if (!matchingRow.is_active || matchingRow.display_order !== displayOrder || matchingRow.config_value !== value) {
            await query<ResultSetHeader>(
              'UPDATE brain_config SET config_value = ?, display_order = ?, is_active = TRUE WHERE id = ?',
              [value, displayOrder, matchingRow.id]
            );
          }
        } else {
          await query<ResultSetHeader>(
            'INSERT INTO brain_config (config_type, config_value, display_order, is_active) VALUES (?, ?, ?, TRUE)',
            ['priority', value, displayOrder]
          );
        }
      }

      const legacyConfigValues = existingRows
        .map((row) => row.config_value)
        .filter((value): value is string => Boolean(value))
        .filter((value) => !canonical.some((item) => item.toLowerCase() === value.toLowerCase()))
        .filter((value, index, arr) => arr.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);

      if (legacyConfigValues.length > 0) {
        await query<ResultSetHeader>(
          `DELETE FROM brain_config
           WHERE config_type = ?
           AND LOWER(config_value) IN (${legacyConfigValues.map(() => '?').join(',')})`,
          ['priority', ...legacyConfigValues.map((value) => value.toLowerCase())]
        );
      }

      const validPriorityList = canonical.map((value) => value.toLowerCase());
      await query<ResultSetHeader>(
        `UPDATE tasks
         SET priority = ?
         WHERE priority IS NULL OR TRIM(priority) = ''`,
        ['Normal']
      );

      const taskPriorityRows = await query<Array<{ priority: string | null }>>(
        'SELECT DISTINCT priority FROM tasks'
      );

      for (const row of taskPriorityRows) {
        const currentValue = row.priority?.trim();
        if (!currentValue) continue;
        const normalizedValue = normalizeTaskPriority(currentValue);
        if (normalizedValue !== currentValue && validPriorityList.includes(normalizedValue.toLowerCase())) {
          await query<ResultSetHeader>(
            'UPDATE tasks SET priority = ? WHERE priority = ?',
            [normalizedValue, currentValue]
          );
        }
      }

      const defaultRows = await query<BrainDefault[]>(
        'SELECT default_value FROM brain_defaults WHERE default_key = ? LIMIT 1',
        ['default_priority']
      );

      if (defaultRows.length === 0) {
        await query<ResultSetHeader>(
          'INSERT INTO brain_defaults (default_key, default_value) VALUES (?, ?)',
          ['default_priority', 'Normal']
        );
      } else {
        const normalizedDefault = normalizeTaskPriority(defaultRows[0].default_value);
        if (normalizedDefault !== defaultRows[0].default_value) {
          await query<ResultSetHeader>(
            'UPDATE brain_defaults SET default_value = ? WHERE default_key = ?',
            [normalizedDefault, 'default_priority']
          );
        }
      }
    })()
      .finally(() => {
        this.lastPriorityIntegrityAt = Date.now();
        this.priorityIntegrityPromise = null;
      });

    await this.priorityIntegrityPromise;
  }

  // Get all config by type. Categories come from brain_config.
  // Team members are derived from users + organizational assignments.
  static async getConfigByType(type: string, username?: string): Promise<any[]> {
    if (type === 'priority') {
      await this.ensurePriorityIntegrity();
    }

    if (type === 'category') {
      // Return full objects with tags for categories.
      // Older databases may not have category_tag yet, so fall back safely.
      try {
        const results = await query<BrainConfig[]>(
          'SELECT config_value, category_tag FROM brain_config WHERE config_type = ? AND is_active = TRUE ORDER BY display_order',
          [type]
        );
        return results.map(r => ({ value: r.config_value, tag: r.category_tag || 'Lainnya' }));
      } catch (error: any) {
        if (String(error?.message || '').toLowerCase().includes('category_tag')) {
          const results = await query<BrainConfig[]>(
            'SELECT config_value FROM brain_config WHERE config_type = ? AND is_active = TRUE ORDER BY display_order',
            [type]
          );
          return results.map(r => ({ value: r.config_value, tag: 'Lainnya' }));
        }
        throw error;
      }
    } else if (type === 'team') {
      if (username) {
        console.log(`[BrainModel] Getting team members for user: ${username}`);

        const userUnits = await query<any[]>(`
          SELECT ous.org_unit_id, ou.unit_name, ou.unit_type, ou.color
          FROM org_unit_staff ous
          JOIN organizational_units ou ON ous.org_unit_id = ou.id
          WHERE ous.username = ? AND ou.is_active = 1
          ORDER BY ous.is_primary DESC, ou.unit_name ASC
        `, [username]);

        console.log(`[BrainModel] User ${username} is in ${userUnits.length} organizational units`);

        if (userUnits.length === 0) {
          console.log(`[BrainModel] User ${username} has no organizational assignments, falling back to self only`);
          return (await this.getWorkspaceMembers(username)).filter((member: any) => member.username === username);
        }

        const unitIds = userUnits.map(u => u.org_unit_id);

        const results = await query<any[]>(`
          SELECT 
            u.username,
            u.full_name,
            u.job_position,
            u.avatar,
            u.organization,
            COALESCE((
              SELECT w.name
              FROM workspaces w
              JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
              WHERE wm.username = u.username AND w.is_active = 1
              ORDER BY wm.is_primary DESC, w.created_at ASC
              LIMIT 1
            ), 'Workspace') AS workspace_name,
            GROUP_CONCAT(DISTINCT ou.unit_name ORDER BY ou.unit_name SEPARATOR ', ') AS shared_units,
            MAX(CASE ous.role
              WHEN 'owner' THEN 6
              WHEN 'direktur' THEN 5
              WHEN 'manager' THEN 4
              WHEN 'leader' THEN 3
              WHEN 'support' THEN 2
              ELSE 1
            END) AS role_rank
          FROM org_unit_staff ous
          JOIN users u ON ous.username = u.username
          JOIN organizational_units ou ON ous.org_unit_id = ou.id
          WHERE ous.org_unit_id IN (${unitIds.map(() => '?').join(',')})
            AND u.is_active = 1
          GROUP BY u.username, u.full_name, u.job_position, u.avatar, u.organization
          ORDER BY CASE WHEN u.username = ? THEN 0 ELSE 1 END, u.full_name ASC, u.username ASC
        `, [...unitIds, username]);

        console.log(`[BrainModel] Found ${results.length} unique team members for user ${username}`);

        return results.map((row) => this.mapMemberRow({
          ...row,
          primary_unit_name: row.shared_units?.split(',')[0]?.trim() || '',
          team_role:
            row.role_rank >= 6 ? 'owner' :
            row.role_rank === 5 ? 'direktur' :
            row.role_rank === 4 ? 'manager' :
            row.role_rank === 3 ? 'leader' :
            row.role_rank === 2 ? 'support' :
            'staff'
        }));
      } else {
        console.log('[BrainModel] Getting all workspace members (admin mode)');
        const members = await this.getWorkspaceMembers();
        console.log(`[BrainModel] Found ${members.length} active workspace members`);
        return members;
      }
    } else {
      // Return simple strings for other types
      const results = await query<BrainConfig[]>(
        'SELECT config_value FROM brain_config WHERE config_type = ? AND is_active = TRUE ORDER BY display_order',
        [type]
      );

      if (type === 'priority') {
        const canonical = getCanonicalTaskPriorities();
        const activeValues = new Set(
          results
            .map((row) => normalizeTaskPriority(row.config_value, 'Normal'))
            .filter(Boolean)
            .map((value) => value.toLowerCase())
        );

        const ordered = canonical.filter((value) => activeValues.has(value.toLowerCase()));
        return ordered.length > 0 ? ordered : canonical;
      }

      return results.map(r => r.config_value);
    }
  }

  // Get team members (replaces brain_config.team as source of truth)
  static async getTeamMembers(username?: string): Promise<any[]> {
    return this.getConfigByType('team', username);
  }

  // Get all configs grouped
  static async getAllConfigs(username?: string) {
    const [team, status, priority, progress, categories] = await Promise.all([
      this.getTeamMembers(username),
      this.getConfigByType('status'),
      this.getConfigByType('priority'),
      this.getConfigByType('progress'),
      this.getConfigByType('category'),
    ]);

    return { team, status, priority, progress, categories };
  }

  // Get all defaults
  static async getDefaults() {
    const results = await query<BrainDefault[]>(
      'SELECT default_key, default_value FROM brain_defaults'
    );
    
    const defaults: Record<string, string> = {};
    results.forEach(r => {
      defaults[r.default_key] = r.default_value;
    });
    
    return defaults;
  }

  // Add new config item (with tag for categories)
  static async addConfig(type: string, value: string, tag?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Value is required' };
      }

      if (type === 'priority' && !isCanonicalTaskPriority(normalizedValue)) {
        return { success: false, error: `Priority must be one of: ${getCanonicalTaskPriorities().join(', ')}` };
      }

      // Validate tag for categories
      const validTags = ['Perusahaan', 'Unit Bisnis', 'Brand', 'Produk', 'Lainnya'];
      const categoryTag = type === 'category' && tag ? (validTags.includes(tag) ? tag : 'Lainnya') : null;

      // Check if already exists
      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ?',
        [type, normalizedValue]
      );

      if (existing.length > 0) {
        return { success: false, error: 'Item already exists' };
      }

      // Get next display order
      const maxOrder = await query<any[]>(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM brain_config WHERE config_type = ?',
        [type]
      );

      await query<ResultSetHeader>(
        'INSERT INTO brain_config (config_type, config_value, category_tag, display_order) VALUES (?, ?, ?, ?)',
        [type, normalizedValue, categoryTag, maxOrder[0].max_order + 1]
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update config item (with tag for categories)
  static async updateConfig(type: string, oldValue: string, newValue: string, tag?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedOldValue = normalizeText(oldValue);
      const normalizedNewValue = type === 'priority'
        ? normalizeTaskPriority(normalizeText(newValue))
        : normalizeText(newValue);

      if (!normalizedOldValue || !normalizedNewValue) {
        return { success: false, error: 'Value is required' };
      }

      if (type === 'priority' && !isCanonicalTaskPriority(normalizedNewValue)) {
        return { success: false, error: `Priority must be one of: ${getCanonicalTaskPriorities().join(', ')}` };
      }

      // Validate tag for categories
      const validTags = ['Perusahaan', 'Unit Bisnis', 'Brand', 'Produk', 'Lainnya'];
      const categoryTag = type === 'category' && tag ? (validTags.includes(tag) ? tag : 'Lainnya') : null;

      if (normalizedOldValue === normalizedNewValue && (!tag || type !== 'category')) {
        return { success: true };
      }

      // Check if new value already exists (excluding current)
      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ? AND config_value != ?',
        [type, normalizedNewValue, normalizedOldValue]
      );

      if (existing.length > 0) {
        return { success: false, error: 'Item already exists' };
      }

      // Update with tag if category
      if (type === 'category') {
        await query<ResultSetHeader>(
          'UPDATE brain_config SET config_value = ?, category_tag = ? WHERE config_type = ? AND config_value = ?',
          [normalizedNewValue, categoryTag, type, normalizedOldValue]
        );
      } else {
        await query<ResultSetHeader>(
          'UPDATE brain_config SET config_value = ? WHERE config_type = ? AND config_value = ?',
          [normalizedNewValue, type, normalizedOldValue]
        );
      }

      if (type === 'category') {
        await query<ResultSetHeader>(
          'UPDATE projects SET category = ? WHERE category = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'status') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET status = ? WHERE status = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'priority') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET priority = ? WHERE priority = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'progress') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET progress = ? WHERE progress = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      const defaults = await query<BrainDefault[]>(
        'SELECT default_key, default_value FROM brain_defaults WHERE default_value = ?',
        [normalizedOldValue]
      );

      for (const entry of defaults) {
        await this.updateDefault(entry.default_key, normalizedNewValue);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete config item (with usage check)
  static async deleteConfig(type: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Value is required' };
      }

      // Check usage in projects
      if (type === 'category') {
        const usedInProjects = await query<any[]>(
          'SELECT COUNT(*) as count FROM projects WHERE category = ?',
          [normalizedValue]
        );
        if (usedInProjects[0].count > 0) {
          return { success: false, error: `Used in ${usedInProjects[0].count} project(s)` };
        }
      }

      if (type === 'status') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE status = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      if (type === 'priority') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE priority = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      if (type === 'progress') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE progress = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      const usedInDefaults = await query<any[]>(
        'SELECT COUNT(*) as count FROM brain_defaults WHERE default_value = ?',
        [normalizedValue]
      );
      if (usedInDefaults[0].count > 0) {
        return { success: false, error: 'Used in default configuration' };
      }

      await query<ResultSetHeader>(
        'DELETE FROM brain_config WHERE config_type = ? AND config_value = ?',
        [type, normalizedValue]
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update default value
  static async updateDefault(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mappedType = this.defaultTypeMap[key as keyof typeof this.defaultTypeMap];
      if (!mappedType) {
        return { success: false, error: 'Invalid default key' };
      }

      const normalizedValue = key === 'default_priority'
        ? normalizeTaskPriority(normalizeText(value))
        : normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Default value is required' };
      }

      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ? AND is_active = TRUE LIMIT 1',
        [mappedType, normalizedValue]
      );

      if (existing.length === 0) {
        return { success: false, error: 'Default value must exist in configuration list' };
      }

      await query<ResultSetHeader>(
        'INSERT INTO brain_defaults (default_key, default_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE default_value = ?',
        [key, normalizedValue, normalizedValue]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
