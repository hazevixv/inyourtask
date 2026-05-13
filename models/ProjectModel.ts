import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { LogModel } from './LogModel';
import { firstCsvItem, normalizeCsvList, normalizeText } from '@/lib/normalizers';

export interface Project extends RowDataPacket {
  id: number;
  project_id: string;
  workspace_id?: string | null;
  project_name: string;
  category: string;
  owner: string | null;
  assignees: string | null;
  status: 'Planning' | 'Active' | 'On Hold' | 'Closed';
  notes: string | null;
  url: string | null;
  brief: string | null;
  progress: number;
  start_date: Date | null;
  due_date: Date | null;
  closed_date: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  task_count?: number;
}

export interface CreateProjectData {
  project_name: string;
  category: string;
  workspace_id?: string | null;
  owner?: string;
  assignees?: string;
  status?: string;
  notes?: string;
  url?: string;
  brief?: string;
  division?: string;
  org_unit_id?: number;
  visibility?: string;
  created_by_id?: number;
}

export interface UpdateProjectData {
  project_name?: string;
  category?: string;
  owner?: string;
  assignees?: string;
  status?: string;
  notes?: string;
  url?: string;
  brief?: string;
}

export class ProjectModel {
  // Generate next project ID
  static async generateProjectId(): Promise<string> {
    const result = await query<Array<{ project_id: string }>>(
      `SELECT project_id
       FROM projects
       WHERE project_id LIKE 'PRJ-%'
       ORDER BY CAST(SUBSTRING(project_id, 5) AS UNSIGNED) DESC
       LIMIT 1`
    );
    const currentMax = result[0]?.project_id ? Number(result[0].project_id.replace('PRJ-', '')) : 0;
    return `PRJ-${String(currentMax + 1).padStart(3, '0')}`;
  }

  // Get all projects with task count
  static async getAll(): Promise<Project[]> {
    const projects = await query<Project[]>(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return projects;
  }

  // Get project by ID
  static async getById(projectId: string): Promise<Project | null> {
    const results = await query<Project[]>(
      'SELECT * FROM projects WHERE project_id = ?',
      [projectId]
    );
    return results[0] || null;
  }

  // Create new project
  static async create(data: CreateProjectData, changedBy: string = 'System'): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const projectName = normalizeText(data.project_name);
      const category = normalizeText(data.category);
      const workspaceId = normalizeText(data.workspace_id) || null;
      const assignees = normalizeCsvList(data.assignees);
      const owner = normalizeText(data.owner) || firstCsvItem(assignees);
      const status = normalizeText(data.status) || 'Planning';
      const notes = normalizeText(data.notes);
      const url = normalizeText(data.url);
      const brief = normalizeText(data.brief);

      if (!projectName) {
        return { success: false, error: 'Project name is required' };
      }

      if (!category) {
        return { success: false, error: 'Category is required' };
      }

      const projectId = await this.generateProjectId();
      
      // Set visibility
      const visibility = normalizeText(data.visibility) || 'public';
      const createdById = data.created_by_id || null;

      await query<ResultSetHeader>(
        `INSERT INTO projects (project_id, workspace_id, project_name, category, owner, assignees, status, notes, url, brief, start_date, version, created_by, visibility) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          workspaceId,
          projectName,
          category,
          owner,
          assignees,
          status,
          notes,
          url,
          brief,
          status === 'Active' ? new Date() : null,
          1, // Start with version 1
          createdById,
          visibility
        ]
      );

      await LogModel.create({
        item_type: 'Project',
        item_id: projectId,
        item_name: projectName,
        change_type: 'Created',
        from_version: 0,
        to_version: 1,
        from_value: '',
        to_value: `${category} • ${status}`,
        changed_by: changedBy,
        notes: 'Project created'
      });

      return { success: true, id: projectId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update project
  static async update(projectId: string, data: UpdateProjectData, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const oldProject = await this.getById(projectId);
      if (!oldProject) {
        return { success: false, error: 'Project not found' };
      }

      const nextData: UpdateProjectData = {
        project_name: data.project_name !== undefined ? normalizeText(data.project_name) || '' : undefined,
        category: data.category !== undefined ? normalizeText(data.category) || '' : undefined,
        owner: data.owner !== undefined ? normalizeText(data.owner) || '' : undefined,
        assignees: data.assignees !== undefined ? normalizeCsvList(data.assignees) || '' : undefined,
        status: data.status !== undefined ? normalizeText(data.status) || '' : undefined,
        notes: data.notes !== undefined ? normalizeText(data.notes) || '' : undefined,
        url: data.url !== undefined ? normalizeText(data.url) || '' : undefined,
        brief: data.brief !== undefined ? normalizeText(data.brief) || '' : undefined,
      };

      const resolvedOwner =
        nextData.owner !== undefined
          ? nextData.owner || firstCsvItem(nextData.assignees ?? oldProject.assignees)
          : nextData.assignees !== undefined
            ? oldProject.owner || firstCsvItem(nextData.assignees)
            : undefined;

      const updates: string[] = [];
      const values: any[] = [];

      if (nextData.project_name !== undefined) {
        updates.push('project_name = ?');
        values.push(nextData.project_name);
      }
      if (nextData.category !== undefined) {
        updates.push('category = ?');
        values.push(nextData.category);
      }
      if (resolvedOwner !== undefined) {
        updates.push('owner = ?');
        values.push(resolvedOwner || null);
      }
      if (nextData.assignees !== undefined) {
        updates.push('assignees = ?');
        values.push(nextData.assignees || null);
      }
      if (nextData.status !== undefined) {
        updates.push('status = ?');
        values.push(nextData.status);
        
        // Auto-set dates based on status
        if (nextData.status === 'Active' && !oldProject.start_date) {
          updates.push('start_date = ?');
          values.push(new Date());
        }
        if (nextData.status === 'Closed') {
          updates.push('closed_date = ?');
          values.push(new Date());
        }
      }
      if (nextData.notes !== undefined) {
        updates.push('notes = ?');
        values.push(nextData.notes || null);
      }
      if (nextData.url !== undefined) {
        updates.push('url = ?');
        values.push(nextData.url || null);
      }
      if (nextData.brief !== undefined) {
        updates.push('brief = ?');
        values.push(nextData.brief || null);
      }

      if (updates.length === 0) {
        return { success: true };
      }

      // Check if version should increment (brief changes trigger version bump)
      const shouldIncrementVersion = 
        nextData.project_name !== undefined ||
        nextData.category !== undefined ||
        resolvedOwner !== undefined ||
        nextData.assignees !== undefined ||
        nextData.status !== undefined ||
        (nextData.brief !== undefined && nextData.brief !== oldProject.brief);

      if (shouldIncrementVersion) {
        updates.push('version = version + 1');
        
        // Log changes
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
        if (nextData.project_name !== undefined && nextData.project_name !== oldProject.project_name) {
          changes.push({ field: 'Name', oldValue: oldProject.project_name, newValue: nextData.project_name });
        }
        if (nextData.category !== undefined && nextData.category !== oldProject.category) {
          changes.push({ field: 'Category', oldValue: oldProject.category, newValue: nextData.category });
        }
        if (resolvedOwner !== undefined && resolvedOwner !== oldProject.owner) {
          changes.push({ field: 'Owner', oldValue: oldProject.owner, newValue: resolvedOwner });
        }
        if (nextData.assignees !== undefined && nextData.assignees !== oldProject.assignees) {
          changes.push({ field: 'Assignees', oldValue: oldProject.assignees, newValue: nextData.assignees });
        }
        if (nextData.status !== undefined && nextData.status !== oldProject.status) {
          changes.push({ field: 'Status', oldValue: oldProject.status, newValue: nextData.status });
        }
        if (nextData.brief !== undefined && nextData.brief !== oldProject.brief) {
          changes.push({ field: 'Brief/Revisi', oldValue: oldProject.brief || '', newValue: nextData.brief || '' });
        }

        for (const change of changes) {
          await LogModel.create({
            item_type: 'Project',
            item_id: projectId,
            item_name: oldProject.project_name,
            change_type: change.field,
            from_version: oldProject.version,
            to_version: oldProject.version + 1,
            from_value: String(change.oldValue || ''),
            to_value: String(change.newValue || ''),
            changed_by: changedBy
          });
        }
      }

      values.push(projectId);

      await query<ResultSetHeader>(
        `UPDATE projects SET ${updates.join(', ')} WHERE project_id = ?`,
        values
      );

      // Update project progress based on tasks
      await this.updateProgress(projectId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete project
  static async delete(projectId: string, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      await query<ResultSetHeader>(
        'DELETE FROM projects WHERE project_id = ?',
        [projectId]
      );

      await LogModel.create({
        item_type: 'Project',
        item_id: projectId,
        item_name: project.project_name,
        change_type: 'Deleted',
        from_version: project.version,
        to_version: project.version,
        from_value: project.status,
        to_value: '',
        changed_by: changedBy,
        notes: 'Project deleted'
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update project progress based on tasks
  static async updateProgress(projectId: string): Promise<void> {
    const result = await query<any[]>(`
      SELECT AVG(
        CASE 
          WHEN progress = '0%' THEN 0
          WHEN progress = '25%' THEN 25
          WHEN progress = '50%' THEN 50
          WHEN progress = '75%' THEN 75
          WHEN progress = '100%' THEN 100
          ELSE 0
        END
      ) as avg_progress
      FROM tasks
      WHERE project_id = ?
    `, [projectId]);

    const avgProgress = result[0]?.avg_progress || 0;

    await query<ResultSetHeader>(
      'UPDATE projects SET progress = ? WHERE project_id = ?',
      [avgProgress, projectId]
    );

    // Also sync due_date from tasks
    await this.syncDueDate(projectId);
  }

  // Sync project due_date = MAX(task due_date), start_date = MIN(task due_date) if not manually set
  static async syncDueDate(projectId: string): Promise<void> {
    await query<ResultSetHeader>(`
      UPDATE projects p
      SET
        p.due_date = (
          SELECT MAX(t.due_date) FROM tasks t
          WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL
        ),
        p.start_date = COALESCE(
          (SELECT MIN(t.due_date) FROM tasks t
           WHERE t.project_id = p.project_id AND t.due_date IS NOT NULL),
          p.start_date
        )
      WHERE p.project_id = ?
    `, [projectId]);
  }

  // Manually update project due_date (from calendar drag/resize)
  static async updateDueDate(projectId: string, dueDate: string, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const old = await this.getById(projectId);
      if (!old) return { success: false, error: 'Project not found' };

      await query<ResultSetHeader>(
        'UPDATE projects SET due_date = ? WHERE project_id = ?',
        [dueDate || null, projectId]
      );

      await LogModel.create({
        item_type: 'Project',
        item_id: projectId,
        item_name: old.project_name,
        change_type: 'Due Date',
        from_version: old.version,
        to_version: old.version,
        from_value: old.due_date ? String(old.due_date).slice(0, 10) : '(none)',
        to_value: dueDate,
        changed_by: changedBy,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Manually update project start_date (from calendar drag/resize)
  static async updateStartDate(projectId: string, startDate: string, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const old = await this.getById(projectId);
      if (!old) return { success: false, error: 'Project not found' };

      await query<ResultSetHeader>(
        'UPDATE projects SET start_date = ? WHERE project_id = ?',
        [startDate || null, projectId]
      );

      await LogModel.create({
        item_type: 'Project',
        item_id: projectId,
        item_name: old.project_name,
        change_type: 'Start Date',
        from_version: old.version,
        to_version: old.version,
        from_value: old.start_date ? String(old.start_date).slice(0, 10) : '(none)',
        to_value: startDate,
        changed_by: changedBy,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get projects by user (owner or assignee) with task count
  static async getByUser(username: string): Promise<Project[]> {
    return await query<Project[]>(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.project_id = t.project_id
      WHERE p.owner = ? OR p.assignees LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [username, `%${username}%`]);
  }

  // Get projects by owner
  static async getByOwner(owner: string): Promise<Project[]> {
    return await query<Project[]>(
      'SELECT * FROM projects WHERE owner = ? ORDER BY created_at DESC',
      [owner]
    );
  }

  // Get projects by category
  static async getByCategory(category: string): Promise<Project[]> {
    return await query<Project[]>(
      'SELECT * FROM projects WHERE category = ? ORDER BY created_at DESC',
      [category]
    );
  }
}
