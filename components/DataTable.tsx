'use client';

/**
 * DataTable Component
 * 
 * Reusable table component that renders tasks or projects with dynamic column visibility.
 * Extracted from Tasks.tsx and Projects.tsx to support the TableLayout wrapper.
 * 
 * Requirements: 5.5, 5.7, 5.9, 5.10, 14.6
 */

import { CalendarDays, FileText, Link2, NotebookText, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import styles from './DataTable.module.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface DataTableProps {
  type: 'tasks' | 'projects';
  data: any[];
  visibleColumns: string[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

function splitCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDueDate(value?: string | null) {
  return value ? format(new Date(value), 'dd MMM yyyy') : 'No due date';
}

function preview(value?: string | null, max = 88) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function priorityClass(priority: string, classes: Record<string, string>) {
  switch (priority) {
    case 'Urgent':
      return classes.badgeUrgent;
    case 'High':
      return classes.badgeHigh;
    case 'Low':
      return classes.badgeLow;
    case 'Recurring':
      return classes.badgeRecurring;
    default:
      return classes.badgeNormal;
  }
}

// ============================================================================
// Column Rendering Functions
// ============================================================================

/**
 * Check if a column should be visible
 * Requirements: 5.5, 5.9
 */
function isColumnVisible(column: string, visibleColumns: string[]): boolean {
  // Name column is always visible (Requirement 5.7)
  if (column === 'name') return true;
  return visibleColumns.includes(column);
}

/**
 * Render task table headers based on visible columns
 * Requirements: 5.9, 5.10
 */
function renderTaskHeaders(visibleColumns: string[]) {
  return (
    <tr>
      <th>ID</th>
      {isColumnVisible('name', visibleColumns) && <th>Task</th>}
      {isColumnVisible('project_id', visibleColumns) && <th>Project</th>}
      {isColumnVisible('assignees', visibleColumns) && <th>Assignees</th>}
      {isColumnVisible('status', visibleColumns) && <th>Status</th>}
      {isColumnVisible('priority', visibleColumns) && <th>Priority</th>}
      {isColumnVisible('progress', visibleColumns) && <th>Progress</th>}
      {isColumnVisible('due_date', visibleColumns) && <th>Due</th>}
      <th>Version</th>
      <th>Actions</th>
    </tr>
  );
}

/**
 * Render project table headers based on visible columns
 * Requirements: 5.9, 5.10
 */
function renderProjectHeaders(visibleColumns: string[]) {
  return (
    <tr>
      <th>ID</th>
      {isColumnVisible('name', visibleColumns) && <th>Project</th>}
      {isColumnVisible('category', visibleColumns) && <th>Category</th>}
      {isColumnVisible('owner', visibleColumns) && <th>PIC</th>}
      {isColumnVisible('assignees', visibleColumns) && <th>Assignees</th>}
      {isColumnVisible('status', visibleColumns) && <th>Status</th>}
      {isColumnVisible('progress', visibleColumns) && <th>Progress</th>}
      {isColumnVisible('task_count', visibleColumns) && <th>Tasks</th>}
      <th>Version</th>
      <th>Actions</th>
    </tr>
  );
}

/**
 * Render task table row based on visible columns
 * Requirements: 5.9, 5.10
 */
function renderTaskRow(
  task: any,
  visibleColumns: string[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
  index: number
) {
  // Debug logging
  console.log('[renderTaskRow] Task data:', {
    task_id: task.task_id,
    task_name: task.task_name,
    taskName: task.taskName,
    name: task.name,
    allKeys: Object.keys(task)
  });

  const assignees = splitCsv(task.assignees);
  const progressValue = Number(String(task.progress || '0').replace('%', '')) || 0;
  
  // Get task name from any possible field
  const taskName = task.task_name || task.taskName || task.name || 'Unnamed Task';

  return (
    <tr key={`task-${task.task_id}-${index}`}>
      <td><span className={styles.code}>{task.task_id}</span></td>
      
      {isColumnVisible('name', visibleColumns) && (
        <td className={styles.primaryCell}>
          <div className={styles.primaryTitle}>{taskName}</div>
          {(isColumnVisible('brief', visibleColumns) || isColumnVisible('notes', visibleColumns)) && (
            <div className={styles.previewText}>
              {preview(task.brief || task.notes || 'Belum ada brief atau notes.')}
            </div>
          )}
          {isColumnVisible('url', visibleColumns) && task.url && (
            <div className={styles.inlineMeta}>
              <Link2 size={14} />
              {task.url.split('\n').filter(Boolean).length} link
            </div>
          )}
        </td>
      )}
      
      {isColumnVisible('project_id', visibleColumns) && (
        <td>
          <div className={styles.stackCompact}>
            <strong>{task.project_id}</strong>
            {isColumnVisible('due_date', visibleColumns) && (
              <span className={styles.muted}>{formatDueDate(task.due_date)}</span>
            )}
          </div>
        </td>
      )}
      
      {isColumnVisible('assignees', visibleColumns) && (
        <td>
          {assignees.length > 0 ? (
            <div className={styles.assigneeList}>
              {assignees.map((assignee) => (
                <span key={assignee} className={styles.assigneeChip}>{assignee}</span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Unassigned</span>
          )}
        </td>
      )}
      
      {isColumnVisible('status', visibleColumns) && (
        <td>
          <span className={`${styles.badge} ${task.status === 'Done' ? styles.badgeDone : styles.badgeActive}`}>
            {task.status}
          </span>
        </td>
      )}
      
      {isColumnVisible('priority', visibleColumns) && (
        <td>
          <span className={`${styles.badge} ${priorityClass(task.priority, styles)}`}>
            {task.priority}
          </span>
        </td>
      )}
      
      {isColumnVisible('progress', visibleColumns) && (
        <td>
          <div className={styles.metric}>
            <strong>{task.progress}</strong>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressValue}%` }} />
            </div>
          </div>
        </td>
      )}
      
      {isColumnVisible('due_date', visibleColumns) && !isColumnVisible('project_id', visibleColumns) && (
        <td>
          <div className={styles.inlineMeta}>
            <CalendarDays size={14} />
            {formatDueDate(task.due_date)}
          </div>
        </td>
      )}
      
      <td className={styles.muted}>v{task.version}</td>
      
      <td>
        <div className={styles.actionGroup}>
          <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onEdit(task.task_id)}>
            Edit
          </button>
          <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onDelete(task.task_id)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Render project table row based on visible columns
 * Requirements: 5.9, 5.10
 */
function renderProjectRow(
  project: any,
  visibleColumns: string[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
  index: number
) {
  const assignees = splitCsv(project.assignees);

  return (
    <tr key={`project-${project.project_id}-${index}`}>
      <td><span className={styles.code}>{project.project_id}</span></td>
      
      {isColumnVisible('name', visibleColumns) && (
        <td className={styles.primaryCell}>
          <div className={styles.primaryTitle}>{project.project_name}</div>
          {(isColumnVisible('brief', visibleColumns) || isColumnVisible('notes', visibleColumns)) && (
            <div className={styles.previewText}>
              {preview(project.brief || project.notes || 'Belum ada brief.')}
            </div>
          )}
          {isColumnVisible('url', visibleColumns) && project.url && (
            <div className={styles.inlineMeta}>
              <Link2 size={14} />
              {project.url.split('\n').filter(Boolean).length} link
            </div>
          )}
        </td>
      )}
      
      {isColumnVisible('category', visibleColumns) && (
        <td><strong>{project.category}</strong></td>
      )}
      
      {isColumnVisible('owner', visibleColumns) && (
        <td>{project.owner || <span className={styles.muted}>Unassigned</span>}</td>
      )}
      
      {isColumnVisible('assignees', visibleColumns) && (
        <td>
          {assignees.length > 0 ? (
            <div className={styles.assigneeList}>
              {assignees.map((assignee) => (
                <span key={assignee} className={styles.assigneeChip}>{assignee}</span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Unassigned</span>
          )}
        </td>
      )}
      
      {isColumnVisible('status', visibleColumns) && (
        <td>
          <span className={`${styles.badge} ${project.status === 'Closed' ? styles.badgeDone : styles.badgeActive}`}>
            {project.status}
          </span>
        </td>
      )}
      
      {isColumnVisible('progress', visibleColumns) && (
        <td>
          <div className={styles.metric}>
            <strong>{Number(project.progress || 0).toFixed(1)}%</strong>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Number(project.progress || 0)}%` }} />
            </div>
          </div>
        </td>
      )}
      
      {isColumnVisible('task_count', visibleColumns) && (
        <td><strong>{project.task_count || 0}</strong></td>
      )}
      
      <td className={styles.muted}>v{project.version}</td>
      
      <td>
        <div className={styles.actionGroup}>
          <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onEdit(project.project_id)}>
            Edit
          </button>
          <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onDelete(project.project_id)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// DataTable Component
// ============================================================================

export default function DataTable({
  type,
  data,
  visibleColumns,
  onEdit,
  onDelete,
}: DataTableProps) {
  // Debug logging
  console.log('[DataTable] Rendering:', {
    type,
    dataLength: data?.length || 0,
    hasData: !!data,
    isArray: Array.isArray(data),
    visibleColumns,
    firstItem: data?.[0]
  });

  /**
   * Render empty state when no data
   * Requirements: 14.4
   */
  if (!data || data.length === 0) {
    console.log('[DataTable] Showing empty state');
    return (
      <div className={styles.emptyState}>
        No {type} found.
      </div>
    );
  }

  console.log('[DataTable] Rendering table with', data.length, 'items');

  /**
   * Render table based on type
   * Requirements: 5.5, 5.9, 5.10
   * 
   * IMPORTANT: Removed mobile-specific hiding of table view.
   * Table view should be visible on all screen sizes.
   * Mobile responsiveness is handled by horizontal scroll in tableContainer.
   */
  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            {type === 'tasks'
              ? renderTaskHeaders(visibleColumns)
              : renderProjectHeaders(visibleColumns)}
          </thead>
          <tbody>
            {type === 'tasks'
              ? data.map((task, index) => renderTaskRow(task, visibleColumns, onEdit, onDelete, index))
              : data.map((project, index) => renderProjectRow(project, visibleColumns, onEdit, onDelete, index))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
