'use client';

/**
 * ProjectListItem Component
 * 
 * Displays a single project in list view with badges, progress bar, and quick actions.
 * Optimized for mobile with touch-friendly targets (44x44px minimum).
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7, 9.3, 9.8, 12.2, 12.4, 12.6, 12.8
 */

import { memo } from 'react';
import { Folder, Users, Edit2, Trash2 } from 'lucide-react';
import styles from './ProjectListItem.module.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProjectListItemProps {
  project: {
    project_id: string;
    project_name: string;
    category: string;
    owner: string | null;
    assignees: string | null;
    status: 'Planning' | 'Active' | 'On Hold' | 'Closed';
    progress: number;
    task_count?: number;
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
 * Get status badge class
 * Requirements: 12.8
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'Closed':
      return styles.statusClosed;
    case 'Active':
      return styles.statusActive;
    case 'On Hold':
      return styles.statusOnHold;
    case 'Planning':
      return styles.statusPlanning;
    default:
      return styles.statusActive;
  }
}

// ============================================================================
// ProjectListItem Component
// ============================================================================

/**
 * ProjectListItem Component
 * 
 * Displays a single project with:
 * - Project name
 * - Category with folder icon
 * - Status badge
 * - Progress bar with gradient fill
 * - Task count
 * - Assignee list
 * - Quick actions (edit, delete)
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7, 9.3, 9.8, 12.2, 12.4, 12.6, 12.8
 */
function ProjectListItem({ project, visibleColumns, onEdit, onDelete }: ProjectListItemProps) {
  const assignees = parseAssignees(project.assignees);
  const progressValue = Math.min(100, Math.max(0, project.progress || 0));
  const isCompleted = project.status === 'Closed';

  /**
   * Handle row click to open edit modal
   * Requirements: 3.6
   */
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) {
      return;
    }
    onEdit(project.project_id);
  };

  /**
   * Handle edit button click
   * Requirements: 3.7
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(project.project_id);
  };

  /**
   * Handle delete button click
   * Requirements: 3.7
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.project_id);
  };

  return (
    <div
      className={styles.projectItem}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(project.project_id);
        }
      }}
      aria-label={`Project: ${project.project_name}`}
    >
      {/* Checkbox for completion status - Requirements: 3.5 */}
      <div className={styles.checkbox}>
        <input
          type="checkbox"
          checked={isCompleted}
          readOnly
          aria-label={`Project ${isCompleted ? 'completed' : 'not completed'}`}
        />
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Project name - Requirements: 3.4, 12.6 */}
        <div className={styles.projectName}>{project.project_name}</div>

        {/* Category with folder icon and badges row */}
        <div className={styles.metadata}>
          {/* Category with folder icon - Requirements: 3.4 */}
          {visibleColumns.includes('category') && (
            <span className={styles.category}>
              <Folder size={14} />
              {project.category}
            </span>
          )}

          {/* Status badge - Requirements: 3.4, 12.8 */}
          {visibleColumns.includes('status') && (
            <span className={`${styles.badge} ${getStatusClass(project.status)}`}>
              {project.status}
            </span>
          )}

          {/* Task count - Requirements: 3.4 */}
          {visibleColumns.includes('task_count') && (
            <span className={styles.taskCount}>
              {project.task_count || 0} tasks
            </span>
          )}
        </div>

        {/* Progress bar - Requirements: 3.4 */}
        {visibleColumns.includes('progress') && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressValue}%` }}
                role="progressbar"
                aria-valuenow={progressValue}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${progressValue}%`}
              />
            </div>
            <span className={styles.progressText}>{progressValue}%</span>
          </div>
        )}

        {/* Assignees - Requirements: 3.4 */}
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

      {/* Quick actions - Requirements: 3.7, 9.3, 9.8 */}
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={handleEdit}
          aria-label="Edit project"
          title="Edit"
        >
          <Edit2 size={18} />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={handleDelete}
          aria-label="Delete project"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

// Export memoized component for performance - Requirements: 12.2
export default memo(ProjectListItem);
