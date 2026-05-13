import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CalendarEvent extends RowDataPacket {
  id: number;
  event_id: string;
  title: string;
  description: string | null;
  event_type: 'event' | 'task' | 'reminder' | 'appointment' | 'meeting';
  start_at: Date;
  end_at: Date;
  all_day: number;
  color: string;
  location: string | null;
  attendees: string | null;
  created_by: string;
  task_id: string | null;
  project_id: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recur_until: Date | null;
  is_cancelled: number;
  created_at: Date;
  updated_at: Date;
}

export class CalendarModel {
  // Get events for a date range
  static async getEvents(username: string, from: string, to: string): Promise<CalendarEvent[]> {
    return query<CalendarEvent[]>(`
      SELECT * FROM calendar_events
      WHERE created_by = ?
        AND is_cancelled = 0
        AND (
          (start_at >= ? AND start_at <= ?)
          OR (end_at >= ? AND end_at <= ?)
          OR (start_at <= ? AND end_at >= ?)
        )
      ORDER BY start_at ASC
    `, [username, from, to, from, to, from, to]);
  }

  // Get all events for user (including from tasks/projects)
  static async getAllEventsWithTasks(username: string, from: string, to: string): Promise<any[]> {
    // Calendar events
    const events = await query<CalendarEvent[]>(`
      SELECT e.*, 'calendar' as source FROM calendar_events e
      WHERE e.created_by = ? AND e.is_cancelled = 0
        AND (
          (e.start_at >= ? AND e.start_at <= ?)
          OR (e.end_at >= ? AND e.end_at <= ?)
        )
      ORDER BY e.start_at ASC
    `, [username, from, to, from, to]);

    // Tasks with due dates in range — only show if user is assignee
    const tasks = await query<any[]>(`
      SELECT
        CONCAT('task-', t.task_id) as event_id,
        t.task_id as linked_task_id,
        t.task_name as title,
        CONCAT(t.status, ' • ', t.priority, ' • ', COALESCE(t.progress,'0%')) as description,
        'task' as event_type,
        t.due_date as start_at,
        t.due_date as end_at,
        1 as all_day,
        CASE t.priority
          WHEN 'Urgent' THEN '#ef4444'
          WHEN 'High'   THEN '#f97316'
          WHEN 'Normal' THEN '#7c3aed'
          WHEN 'Low'    THEN '#10b981'
          WHEN 'Recurring' THEN '#6366f1'
          ELSE '#94a3b8'
        END as color,
        NULL as location,
        t.assignees as attendees,
        t.project_id,
        t.status,
        t.priority,
        t.progress,
        'task' as source
      FROM tasks t
      WHERE t.due_date BETWEEN ? AND ?
        AND t.assignees LIKE ?
        AND t.status NOT IN ('Done', 'Closed')
    `, [from, to, `%${username}%`]);

    // Projects with active status — show as multi-day events if they have start/end dates
    const projects = await query<any[]>(`
      SELECT
        CONCAT('proj-', p.project_id) as event_id,
        p.project_id as linked_project_id,
        CONCAT('📁 ', p.project_name) as title,
        CONCAT(p.status, ' • ', ROUND(p.progress,0), '% complete') as description,
        'event' as event_type,
        COALESCE(p.start_date, p.created_at) as start_at,
        COALESCE(p.closed_date, DATE_ADD(COALESCE(p.start_date, p.created_at), INTERVAL 30 DAY)) as end_at,
        1 as all_day,
        '#6366f1' as color,
        NULL as location,
        p.assignees as attendees,
        p.project_id,
        p.status,
        NULL as priority,
        NULL as progress,
        'project' as source
      FROM projects p
      WHERE p.status = 'Active'
        AND (p.owner = ? OR p.assignees LIKE ?)
        AND COALESCE(p.start_date, p.created_at) BETWEEN ? AND ?
    `, [username, `%${username}%`, from, to]);

    return [...events, ...tasks, ...projects];
  }

  static async getEventById(eventId: string): Promise<CalendarEvent | null> {
    const rows = await query<CalendarEvent[]>(
      'SELECT * FROM calendar_events WHERE event_id = ?', [eventId]
    );
    return rows[0] || null;
  }

  static async createEvent(data: Partial<CalendarEvent>, username: string): Promise<CalendarEvent> {
    await query(
      `INSERT INTO calendar_events
        (title, description, event_type, start_at, end_at, all_day, color, location, attendees, created_by, task_id, project_id, recurrence, recur_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, data.description, data.event_type || 'event',
        data.start_at, data.end_at, data.all_day || 0,
        data.color || '#7c3aed', data.location, data.attendees,
        username, data.task_id, data.project_id,
        data.recurrence || 'none', data.recur_until || null
      ]
    );
    const rows = await query<CalendarEvent[]>(
      'SELECT * FROM calendar_events WHERE created_by = ? ORDER BY id DESC LIMIT 1', [username]
    );
    return rows[0];
  }

  static async updateEvent(eventId: string, data: Partial<CalendarEvent>, username: string): Promise<boolean> {
    const fields: string[] = [];
    const vals: any[] = [];
    const allowed = ['title','description','event_type','start_at','end_at','all_day','color','location','attendees','task_id','project_id','recurrence','recur_until'];
    for (const key of allowed) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${key} = ?`);
        vals.push((data as any)[key]);
      }
    }
    if (!fields.length) return false;
    vals.push(eventId, username);
    await query(`UPDATE calendar_events SET ${fields.join(', ')} WHERE event_id = ? AND created_by = ?`, vals);
    return true;
  }

  static async deleteEvent(eventId: string, username: string): Promise<boolean> {
    await query(
      'UPDATE calendar_events SET is_cancelled = 1 WHERE event_id = ? AND created_by = ?',
      [eventId, username]
    );
    return true;
  }

  // Sync task due date to calendar
  static async syncTaskToCalendar(taskId: string, taskName: string, dueDate: string, username: string, projectId?: string): Promise<void> {
    const existing = await query<any[]>(
      'SELECT event_id FROM calendar_events WHERE task_id = ? AND created_by = ?',
      [taskId, username]
    );
    if (existing[0]) {
      await query(
        'UPDATE calendar_events SET title = ?, end_at = ?, start_at = ? WHERE task_id = ? AND created_by = ?',
        [taskName, dueDate, dueDate, taskId, username]
      );
    } else {
      await this.createEvent({
        title: taskName,
        event_type: 'task',
        start_at: new Date(dueDate),
        end_at: new Date(dueDate),
        all_day: 1,
        color: '#7c3aed',
        task_id: taskId,
        project_id: projectId,
      } as any, username);
    }
  }
}
