import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { LogModel } from './LogModel';
import { ProjectModel } from './ProjectModel';
import { normalizeCsvList, normalizeOptionalDate, normalizeText } from '@/lib/normalizers';
import { normalizeTaskPriority } from '@/lib/task-priority';

export interface Task extends RowDataPacket {
  id: number;
  task_id: string;
  workspace_id?: string | null;
  task_name: string;
  project_id: string;
  assignees: string | null;
  status: string;
  priority: string;
  progress: string;
  due_date: Date | null;
  start_date: Date | null;
  notes: string | null;
  url: string | null;
  brief: string | null;
  log_notes: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskData {
  task_name: string;
  project_id: string;
  workspace_id?: string | null;
  assignees?: string;
  status?: string;
  priority?: string;
  progress?: string;
  due_date?: string;
  notes?: string;
  url?: string;
  brief?: string;
  division?: string;
  org_unit_id?: number;
  visibility?: string;
  created_by_id?: number;
}

export interface UpdateTaskData {
  task_name?: string;
  project_id?: string;
  assignees?: string;
  status?: string;
  priority?: string;
  progress?: string;
  due_date?: string;
  notes?: string;
  url?: string;
  brief?: string;
}

export class TaskModel {
  // Generate next task ID
  static async generateTaskId(): Promise<string> {
    const result = await query<Array<{ task_id: string }>>(
      `SELECT task_id
       FROM tasks
       WHERE task_id LIKE 'TSK-%'
       ORDER BY CAST(SUBSTRING(task_id, 5) AS UNSIGNED) DESC
       LIMIT 1`
    );
    const currentMax = result[0]?.task_id ? Number(result[0].task_id.replace('TSK-', '')) : 0;
    return `TSK-${String(currentMax + 1).padStart(3, '0')}`;
  }

  // Get all tasks
  static async getAll(): Promise<Task[]> {
    return await query<Task[]>(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
  }

  // Get task by ID
  static async getById(taskId: string): Promise<Task | null> {
    const results = await query<Task[]>(
      'SELECT * FROM tasks WHERE task_id = ?',
      [taskId]
    );
    return results[0] || null;
  }

  // Get tasks by project
  static async getByProject(projectId: string): Promise<Task[]> {
    return await query<Task[]>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
  }

  // Get tasks by assignees (supports multiple assignees)
  static async getByAssignee(assignee: string): Promise<Task[]> {
    return await query<Task[]>(
      'SELECT * FROM tasks WHERE assignees LIKE ? ORDER BY created_at DESC',
      [`%${assignee}%`]
    );
  }

  // Create new task
  static async create(data: CreateTaskData, changedBy: string = 'System'): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const taskName = normalizeText(data.task_name);
      const projectId = normalizeText(data.project_id);
      const workspaceId = normalizeText(data.workspace_id) || null;
      const assignees = normalizeCsvList(data.assignees);
      const notes = normalizeText(data.notes);
      const url = normalizeText(data.url);
      const brief = normalizeText(data.brief);
      const dueDate = normalizeOptionalDate(data.due_date);
      const status = normalizeText(data.status) || 'Backlog';
      const priority = normalizeTaskPriority(normalizeText(data.priority));
      const progress = normalizeText(data.progress) || '0%';

      if (!taskName) {
        return { success: false, error: 'Task name is required' };
      }

      if (!projectId) {
        return { success: false, error: 'Project is required' };
      }

      // Validate project exists
      const project = await ProjectModel.getById(projectId);
      if (!project) {
        return { success: false, error: `Project ${projectId} not found` };
      }

      const taskId = await this.generateTaskId();
      
      const shouldSetStartDate = ['In Progress', 'Minggu Ini'].includes(status);
      
      // Set visibility
      const visibility = normalizeText(data.visibility) || 'public';
      const createdById = data.created_by_id || null;
      
      await query<ResultSetHeader>(
        `INSERT INTO tasks (task_id, workspace_id, task_name, project_id, assignees, status, priority, progress, due_date, start_date, notes, url, brief, version, created_by, visibility) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          workspaceId,
          taskName,
          projectId,
          assignees,
          status,
          priority,
          progress,
          dueDate,
          shouldSetStartDate ? new Date() : null,
          notes,
          url,
          brief,
          1, // Start with version 1
          createdById,
          visibility
        ]
      );

      await LogModel.create({
        item_type: 'Task',
        item_id: taskId,
        item_name: taskName,
        change_type: 'Created',
        from_version: 0,
        to_version: 1,
        from_value: '',
        to_value: `${priority || 'normal'} • ${status || 'backlog'}`,
        changed_by: changedBy,
        notes: 'Task created'
      });

      return { success: true, id: taskId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update task
  static async update(taskId: string, data: UpdateTaskData, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const oldTask = await this.getById(taskId);
      if (!oldTask) {
        return { success: false, error: 'Task not found' };
      }

      const nextData: UpdateTaskData = {
        task_name: data.task_name !== undefined ? normalizeText(data.task_name) || '' : undefined,
        project_id: data.project_id !== undefined ? normalizeText(data.project_id) || '' : undefined,
        assignees: data.assignees !== undefined ? normalizeCsvList(data.assignees) || '' : undefined,
        status: data.status !== undefined ? normalizeText(data.status) || '' : undefined,
        priority: data.priority !== undefined ? normalizeTaskPriority(normalizeText(data.priority)) : undefined,
        progress: data.progress !== undefined ? normalizeText(data.progress) || '' : undefined,
        due_date: data.due_date !== undefined ? normalizeOptionalDate(data.due_date) || '' : undefined,
        notes: data.notes !== undefined ? normalizeText(data.notes) || '' : undefined,
        url: data.url !== undefined ? normalizeText(data.url) || '' : undefined,
        brief: data.brief !== undefined ? normalizeText(data.brief) || '' : undefined,
      };

      // Validate project_id if being updated
      if (nextData.project_id && nextData.project_id !== oldTask.project_id) {
        const project = await ProjectModel.getById(nextData.project_id);
        if (!project) {
          return { success: false, error: `Project ${nextData.project_id} not found` };
        }
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (nextData.task_name !== undefined) {
        updates.push('task_name = ?');
        values.push(nextData.task_name);
      }
      if (nextData.project_id !== undefined) {
        updates.push('project_id = ?');
        values.push(nextData.project_id);
      }
      if (nextData.assignees !== undefined) {
        updates.push('assignees = ?');
        values.push(nextData.assignees || null);
      }
      if (nextData.status !== undefined) {
        updates.push('status = ?');
        values.push(nextData.status);
        
        // Auto-set start date
        if (['In Progress', 'Minggu Ini'].includes(nextData.status) && !oldTask.start_date) {
          updates.push('start_date = ?');
          values.push(new Date());
        }
      }
      if (nextData.priority !== undefined) {
        updates.push('priority = ?');
        values.push(nextData.priority);
      }
      if (nextData.progress !== undefined) {
        updates.push('progress = ?');
        values.push(nextData.progress);
      }
      if (nextData.due_date !== undefined) {
        updates.push('due_date = ?');
        values.push(nextData.due_date || null);
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

      // Check if version should increment
      const shouldIncrementVersion = 
        nextData.task_name !== undefined ||
        nextData.project_id !== undefined ||
        nextData.assignees !== undefined ||
        nextData.status !== undefined ||
        nextData.priority !== undefined ||
        nextData.progress !== undefined ||
        nextData.due_date !== undefined ||
        (nextData.brief !== undefined && nextData.brief !== oldTask.brief);

      if (shouldIncrementVersion) {
        updates.push('version = version + 1');
        
        // Log changes
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
        if (nextData.task_name !== undefined && nextData.task_name !== oldTask.task_name) {
          changes.push({ field: 'Name', oldValue: oldTask.task_name, newValue: nextData.task_name });
        }
        if (nextData.project_id !== undefined && nextData.project_id !== oldTask.project_id) {
          changes.push({ field: 'Project', oldValue: oldTask.project_id, newValue: nextData.project_id });
        }
        if (nextData.assignees !== undefined && nextData.assignees !== oldTask.assignees) {
          changes.push({ field: 'Assignees', oldValue: oldTask.assignees, newValue: nextData.assignees });
        }
        if (nextData.status !== undefined && nextData.status !== oldTask.status) {
          changes.push({ field: 'Status', oldValue: oldTask.status, newValue: nextData.status });
        }
        if (nextData.priority !== undefined && nextData.priority !== oldTask.priority) {
          changes.push({ field: 'Priority', oldValue: oldTask.priority, newValue: nextData.priority });
        }
        if (nextData.progress !== undefined && nextData.progress !== oldTask.progress) {
          changes.push({ field: 'Progress', oldValue: oldTask.progress, newValue: nextData.progress });
        }
        if (nextData.due_date !== undefined && nextData.due_date !== (oldTask.due_date ? String(oldTask.due_date).slice(0, 10) : '')) {
          changes.push({ field: 'Due Date', oldValue: oldTask.due_date ? String(oldTask.due_date).slice(0, 10) : '(none)', newValue: nextData.due_date || '(none)' });
        }
        if (nextData.brief !== undefined && nextData.brief !== oldTask.brief) {
          changes.push({ field: 'Brief/Revisi', oldValue: oldTask.brief || '', newValue: nextData.brief || '' });
        }

        for (const change of changes) {
          await LogModel.create({
            item_type: 'Task',
            item_id: taskId,
            item_name: oldTask.task_name,
            project_name: oldTask.project_id,
            change_type: change.field,
            from_version: oldTask.version,
            to_version: oldTask.version + 1,
            from_value: String(change.oldValue || ''),
            to_value: String(change.newValue || ''),
            changed_by: changedBy
          });
        }
      }

      values.push(taskId);

      await query<ResultSetHeader>(
        `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = ?`,
        values
      );

      // Update project progress
      await ProjectModel.updateProgress(oldTask.project_id);
      if (nextData.project_id && nextData.project_id !== oldTask.project_id) {
        await ProjectModel.updateProgress(nextData.project_id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete task
  static async delete(taskId: string, changedBy: string = 'System'): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      await query<ResultSetHeader>(
        'DELETE FROM tasks WHERE task_id = ?',
        [taskId]
      );

      // Update project progress
      await ProjectModel.updateProgress(task.project_id);

      await LogModel.create({
        item_type: 'Task',
        item_id: taskId,
        item_name: task.task_name,
        project_name: task.project_id,
        change_type: 'Deleted',
        from_version: task.version,
        to_version: task.version,
        from_value: task.status,
        to_value: '',
        changed_by: changedBy,
        notes: 'Task deleted'
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get urgent tasks
  static async getUrgent(): Promise<Task[]> {
    return await query<Task[]>(
      "SELECT * FROM tasks WHERE priority = 'Urgent' AND status != 'Done' ORDER BY due_date ASC"
    );
  }

  // Get overdue tasks
  static async getOverdue(): Promise<Task[]> {
    return await query<Task[]>(
      "SELECT * FROM tasks WHERE due_date < CURDATE() AND status != 'Done' ORDER BY due_date ASC"
    );
  }
}
