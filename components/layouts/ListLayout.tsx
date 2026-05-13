'use client';

/**
 * ListLayout Component
 * 
 * Renders data in compact list format with optional grouping.
 * Supports both Tasks (with grouping) and Projects (flat list).
 * Uses virtualization for 50+ items for performance.
 * 
 * Requirements: 2.1, 2.4, 3.1, 8.4, 9.4, 9.7, 11.1, 11.8, 14.4
 */

import { memo, useMemo } from 'react';
import { List } from 'react-window';
import TaskGroupList from './TaskGroupList';
import TaskListItem from './TaskListItem';
import ProjectListItem from './ProjectListItem';
import styles from './ListLayout.module.css';

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

interface Project {
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
}

interface TaskGroup {
  projectId: string;
  projectName: string;
  tasks: Task[];
  isCollapsed: boolean;
}

interface ListLayoutProps {
  type: 'tasks' | 'projects';
  data: Task[] | Project[] | TaskGroup[];
  visibleColumns: string[];
  isGrouped: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleGroup?: (groupId: string) => void;
}

// ============================================================================
// ListLayout Component
// ============================================================================

/**
 * ListLayout Component
 * 
 * Conditionally renders:
 * - TaskGroupList when isGrouped=true (Tasks with grouping)
 * - Flat TaskListItem list when isGrouped=false (Tasks without grouping)
 * - ProjectListItem list for Projects (not yet implemented in this task)
 * 
 * Features:
 * - Virtualization for 50+ items (to be implemented in task 12.1)
 * - Empty state handling
 * - Mobile-optimized spacing
 * 
 * Requirements: 2.1, 2.4, 3.1, 8.4, 9.4, 9.7, 11.1, 11.8, 14.4
 */
function ListLayout({
  type,
  data,
  visibleColumns,
  isGrouped,
  onEdit,
  onDelete,
  onToggleGroup,
}: ListLayoutProps) {
  /**
   * Sort projects by project_id ascending - Requirements: 3.9
   * Must be at top level to satisfy React Hooks rules
   */
  const sortedProjects = useMemo(() => {
    if (type !== 'projects') return [];
    const projects = data as Project[];
    return [...projects].sort((a, b) => {
      const aId = a.project_id.toLowerCase();
      const bId = b.project_id.toLowerCase();
      return aId < bId ? -1 : aId > bId ? 1 : 0;
    });
  }, [type, data]);

  /**
   * Check if data is empty
   * Requirements: 14.4
   */
  const isEmpty = useMemo(() => {
    if (!data || data.length === 0) return true;
    
    // For grouped data, check if all groups are empty
    if (isGrouped && type === 'tasks') {
      const groups = data as TaskGroup[];
      return groups.every((group) => group.tasks.length === 0);
    }
    
    return false;
  }, [data, isGrouped, type]);

  /**
   * Render empty state
   * Requirements: 14.4
   */
  if (isEmpty) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <p className={styles.emptyMessage}>No items match your filters</p>
          <p className={styles.emptyHint}>Try adjusting your filters or create a new {type === 'tasks' ? 'task' : 'project'}</p>
        </div>
      </div>
    );
  }

  /**
   * Render grouped task list
   * Requirements: 2.1, 8.4
   */
  if (type === 'tasks' && isGrouped) {
    const groups = data as TaskGroup[];
    
    return (
      <div className={styles.listContainer}>
        <TaskGroupList
          groups={groups}
          visibleColumns={visibleColumns}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleGroup={onToggleGroup || (() => {})}
        />
      </div>
    );
  }

  /**
   * Render flat task list
   * Requirements: 2.4, 8.4, 9.4
   */
  if (type === 'tasks' && !isGrouped) {
    const tasks = data as Task[];
    
    return (
      <div className={styles.listContainer}>
        <div className={styles.flatList}>
          {tasks.map((task) => (
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
    );
  }

  /**
   * Render projects list
   * Requirements: 3.1, 3.9, 11.1
   */
  if (type === 'projects') {
    // Use virtualization for 50+ projects - Requirements: 11.1
    const useVirtualization = sortedProjects.length >= 50;

    if (useVirtualization) {
      // Calculate dynamic height based on viewport
      const listHeight = typeof window !== 'undefined' 
        ? Math.min(window.innerHeight - 200, sortedProjects.length * 140)
        : 600;

      // Row component for virtualized list - receives index and style from react-window
      const ProjectRow = ({ 
        index, 
        style 
      }: { 
        index: number; 
        style: React.CSSProperties;
      }) => {
        const project = sortedProjects[index];
        return (
          <div style={style}>
            <ProjectListItem
              project={project}
              visibleColumns={visibleColumns}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
      };

      return (
        <div className={styles.listContainer}>
          <List
            defaultHeight={listHeight}
            rowComponent={ProjectRow}
            rowCount={sortedProjects.length}
            rowHeight={140} // Approximate height of ProjectListItem
            rowProps={{} as any} // Empty props object - index and style are provided by react-window
            className={styles.virtualList}
            style={{ height: listHeight, width: '100%' }}
          />
        </div>
      );
    }

    // Non-virtualized list for < 50 projects
    return (
      <div className={styles.listContainer}>
        <div className={styles.flatList}>
          {sortedProjects.map((project) => (
            <ProjectListItem
              key={project.project_id}
              project={project}
              visibleColumns={visibleColumns}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}

// Export memoized component for performance - Requirements: 11.1
export default memo(ListLayout);
