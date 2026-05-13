'use client';

/**
 * TaskListItem Component
 * 
 * Displays a single task in list view with badges, progress, and quick actions.
 * Optimized for mobile with touch-friendly targets (44x44px minimum).
 * 
 * Requirements: 2.4, 2.5, 2.6, 2.7, 9.3, 9.8, 12.2, 12.4, 12.6, 12.8, 12.9
 */

import { memo } from 'react';
import { Calendar, Users, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import styles from './TaskListItem.module.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface TaskListItemProps {
  task: {
    task_id: string;
    task_name: string;
    project_id: string;
    assignees: string | null;
    status: 'Active' | 'Done' | 'Blocked' | 'Pending';
    priority: 'Urgent' | 'High' | 'Normal' | 'Low' | 'Recurring';
    progress: string;
    due_date: string | null;
    notes?: string | null;
    brief?: string | null;
    url?: string | null;
  };
  visibleColumns: string[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse CSV assignees string into array
 */
function parseAssignees(assignees: string | null): string[] {
  if (!assignees) return [];
  return assignees
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Format due date for display
 */
function formatDueDate(date: string | null): string {
  if (!date) return 'No due date';
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Get status badge class
 * Requirements: 12.8
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'Done':
      return styles.statusDone;
    case 'Active':
      return styles.statusActive;
    case 'Blocked':
      return styles.statusBlocked;
    case 'Pending':
      return styles.statusPending;
    default:
      return styles.statusActive;
  }
}

/**
 * Get priority badge class
 * Requirements: 12.9
 */
function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'Urgent':
      return styles.priorityUrgent;
    case 'High':
      return styles.priorityHigh;
    case 'Normal':
      return styles.priorityNormal;
    case 'Low':
      return styles.priorityLow;
    case 'Recurring':
      return styles.priorityRecurring;
    default:
      return styles.priorityNormal;
  }
}

/**
 * Parse progress percentage from string
 */
function parseProgress(progress: string): number {
  const num = parseFloat(progress.replace('%', ''));
  return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
}

// ============================================================================
// TaskListItem Component
// ============================================================================

/**
 * TaskListItem Component
 * 
 * Displays a single task with:
 * - Task name
 * - Status and priority badges
 * - Progress percentage
 * - Due date
 * - Assignee list
 * - Quick actions (edit, delete)
 * 
 * Requirements: 2.4, 2.5, 2.6, 2.7, 9.3, 9.8, 12.2, 12.4, 12.6, 12.8, 12.9
 */
function TaskListItem({ task, visibleColumns, onEdit, onDelete }: TaskListItemProps) {
  const assignees = parseAssignees(task.assignees);
  const progressValue = parseProgress(task.progress);
  const isDone = task.status === 'Done';

  /**
   * Handle row click to open edit modal
   * Requirements: 2.6
   */
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) {
      return;
    }
    onEdit(task.task_id);
  };

  /**
   * Handle edit button click
   * Requirements: 2.7
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task.task_id);
  };

  /**
   * Handle delete button click
   * Requirements: 2.7
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.task_id);
  };

  return (
    <div
      className={styles.taskItem}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(task.task_id);
        }
      }}
      aria-label={`Task: ${task.task_name}`}
    >
      {/* Checkbox for completion status - Requirements: 2.5 */}
      <div className={styles.checkbox}>
        <input
          type="checkbox"
          checked={isDone}
          readOnly
          aria-label={`Task ${isDone ? 'completed' : 'not completed'}`}
        />
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Task name - Requirements: 2.4, 12.6 */}
        <div className={styles.taskName}>{task.task_name}</div>

        {/* Badges and metadata row */}
        <div className={styles.metadata}>
          {/* Status badge - Requirements: 2.4, 12.8 */}
          {visibleColumns.includes('status') && (
            <span className={`${styles.badge} ${getStatusClass(task.status)}`}>
              {task.status}
            </span>
          )}

          {/* Priority badge - Requirements: 2.4, 12.9 */}
          {visibleColumns.includes('priority') && (
            <span className={`${styles.badge} ${getPriorityClass(task.priority)}`}>
              {task.priority}
            </span>
          )}

          {/* Progress percentage - Requirements: 2.4 */}
          {visibleColumns.includes('progress') && (
            <span className={styles.progress}>{progressValue}%</span>
          )}

          {/* Due date - Requirements: 2.4 */}
          {visibleColumns.includes('due_date') && task.due_date && (
            <span className={styles.dueDate}>
              <Calendar size={14} />
              {formatDueDate(task.due_date)}
            </span>
          )}
        </div>

        {/* Assignees - Requirements: 2.4 */}
        {visibleColumns.includes('assignees') && assignees.length > 0 && (
          <div className={styles.assignees}>
            <Users size={14} />
            <div className={styles.assigneeList}>
              {assignees.slice(0, 3).map((assignee, idx) => (
                <span key={idx} className={styles.assigneeChip}>
                  {assignee}
                </span>
              ))}
              {assignees.length > 3 && (
                <span className={styles.assigneeMore}>+{assignees.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions - Requirements: 2.7, 9.3, 9.8 */}
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={handleEdit}
          aria-label="Edit task"
          title="Edit"
        >
          <Edit2 size={18} />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={handleDelete}
          aria-label="Delete task"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

// Export memoized component for performance - Requirements: 12.2
export default memo(TaskListItem);
