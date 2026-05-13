import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Log extends RowDataPacket {
  id: number;
  timestamp: Date;
  item_type: 'Project' | 'Task';
  item_id: string;
  item_name: string | null;
  project_name: string | null;
  change_type: string | null;
  from_version: number | null;
  to_version: number | null;
  from_value: string | null;
  to_value: string | null;
  changed_by: string | null;
  notes: string | null;
}

export interface CreateLogData {
  item_type: 'Project' | 'Task';
  item_id: string;
  item_name?: string;
  project_name?: string;
  change_type?: string;
  from_version?: number;
  to_version?: number;
  from_value?: string;
  to_value?: string;
  changed_by?: string;
  notes?: string;
}

export class LogModel {
  // Create new log entry
  static async create(data: CreateLogData): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(
        `INSERT INTO weekly_snapshot 
         (item_type, item_id, item_name, project_name, change_type, from_version, to_version, from_value, to_value, changed_by, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.item_type,
          data.item_id,
          data.item_name || null,
          data.project_name || null,
          data.change_type || null,
          data.from_version || null,
          data.to_version || null,
          data.from_value || null,
          data.to_value || null,
          data.changed_by || 'System',
          data.notes || 'Auto-increment'
        ]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get recent logs (last 50)
  static async getRecent(limit: number = 50): Promise<Log[]> {
    return await query<Log[]>(
      `SELECT * FROM weekly_snapshot ORDER BY timestamp DESC LIMIT ${limit}`
    );
  }

  // Get all logs
  static async getAll(): Promise<Log[]> {
    return await query<Log[]>(
      `SELECT 
        id,
        timestamp as changed_at,
        item_type,
        item_id,
        item_name,
        project_name,
        change_type,
        from_version,
        to_version,
        from_value,
        to_value,
        changed_by,
        notes
      FROM weekly_snapshot 
      ORDER BY timestamp DESC 
      LIMIT 200`
    );
  }

  // Get logs by item
  static async getByItem(itemType: 'Project' | 'Task', itemId: string): Promise<Log[]> {
    return await query<Log[]>(
      'SELECT * FROM weekly_snapshot WHERE item_type = ? AND item_id = ? ORDER BY timestamp DESC',
      [itemType, itemId]
    );
  }

  // Get logs by date range
  static async getByDateRange(startDate: Date, endDate: Date): Promise<Log[]> {
    return await query<Log[]>(
      'SELECT * FROM weekly_snapshot WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
      [startDate, endDate]
    );
  }
}
