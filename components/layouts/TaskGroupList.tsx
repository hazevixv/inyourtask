'use client';

/**
 * TaskGroupList Component
 * 
 * Displays tasks grouped by project with collapsible headers.
 * Each group shows project info and contains TaskListItem components.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.9, 2.10, 8.7, 12.2, 12.3, 12.7, 14.5
 */

import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TaskListItem from './TaskListItem';
import styles from './TaskGroupList.module.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface Task {
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
}

interface TaskGroup {
  projectId: string;
  projectName: string;
  tasks: Task[];
  isCollapsed: boolean;
}

interface TaskGroupListProps {
  groups: TaskGroup[];
  visibleColumns: string[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleGroup: (groupId: string) => void;
}

// ============================================================================
// TaskGroupHeader Component
// ============================================================================

/**
 * Collapsible group header showing project info and task count
 * Requirements: 2.2, 2.3, 12.3, 12.7
 */
const TaskGroupHeader = memo(function TaskGroupHeader({
  projectId,
  projectName,
  taskCount,
  isCollapsed,
  onToggle,
}: {
  projectId: string;
  projectName: string;
  taskCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={styles.groupHeader}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
      aria-controls={`group-${projectId}`}
      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${projectName} group with ${taskCount} tasks`}
    >
      {/* Collapse/expand icon */}
      <span className={styles.groupIcon}>
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
      </span>

      {/* Project info - Requirements: 2.2, 12.3 */}
      <div className={styles.groupInfo}>
        <span className={styles.groupTitle}>
          <span className={styles.projectId}>{projectId}</span>
          <span className={styles.projectName}>{projectName}</span>
        </span>
        <span className={styles.taskCount}>{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
      </div>
    </button>
  );
});

// ============================================================================
// TaskGroupList Component
// ============================================================================

/**
 * TaskGroupList Component
 * 
 * Renders tasks organized by project groups with:
 * - Collapsible group headers
 * - Project ID, name, and task count
 * - TaskListItem components for each task
 * - Smooth collapse/expand animations (200ms)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.9, 2.10, 8.7, 12.2, 12.3, 12.7, 14.5
 */
function TaskGroupList({
  groups,
  visibleColumns,
  onEdit,
  onDelete,
  onToggleGroup,
}: TaskGroupListProps) {
  /**
   * Filter out empty groups
   * Requirements: 2.9, 14.5
   */
  const nonEmptyGroups = groups.filter((group) => group.tasks.length > 0);

  /**
   * Sort groups by project_id ascending
   * Requirements: 2.10, 8.7
   */
  const sortedGroups = [...nonEmptyGroups].sort((a, b) =>
    a.projectId.localeCompare(b.projectId)
  );

  return (
    <div className={styles.groupList}>
      {sortedGroups.map((group) => (
        <div key={group.projectId} className={styles.group}>
          {/* Group header - Requirements: 2.2, 2.3 */}
          <TaskGroupHeader
            projectId={group.projectId}
            projectName={group.projectName}
            taskCount={group.tasks.length}
            isCollapsed={group.isCollapsed}
            onToggle={() => onToggleGroup(group.projectId)}
          />

          {/* Task list - Requirements: 2.1, 2.3 */}
          {!group.isCollapsed && (
            <div
              id={`group-${group.projectId}`}
              className={styles.groupContent}
              role="region"
              aria-label={`Tasks for ${group.projectName}`}
            >
              <div className={styles.taskList}>
                {group.tasks.map((task) => (
                  <TaskListItem
                    key={task.task_id}
                    task={task}
                    visibleColumns={visibleColumns}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Empty state when all groups are filtered out - Requirements: 14.5 */}
      {sortedGroups.length === 0 && (
        <div className={styles.emptyState}>
          <p>No tasks match your filters</p>
        </div>
      )}
    </div>
  );
}

// Export memoized component for performance - Requirements: 12.2
export default memo(TaskGroupList);
