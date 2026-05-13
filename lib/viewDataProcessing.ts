/**
 * View Data Processing Utilities
 * 
 * Provides functions for filtering, sorting, and grouping data in the view system.
 * Implements the core data manipulation logic for Notion-style views.
 * 
 * Requirements: 6.7, 6.8, 6.12, 7.6, 7.7, 7.12, 8.3, 8.4, 8.6, 8.7, 14.8
 */

import { FilterCondition, SortRule } from './viewPersistence';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Task group structure for grouped list view
 */
export interface TaskGroup {
  projectId: string;
  projectName: string;
  tasks: any[];
  isCollapsed: boolean;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Apply a single filter operator to a value
 * 
 * @param value - The value to test
 * @param operator - The filter operator to apply
 * @param filterValue - The value to compare against (not needed for is_empty/is_not_empty)
 * @returns true if the value matches the filter condition
 * 
 * Requirements: 6.7, 6.8
 */
export function applyFilterOperator(
  value: any,
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'is_empty' | 'is_not_empty',
  filterValue?: any
): boolean {
  switch (operator) {
    case 'equals':
      return value === filterValue;
    
    case 'not_equals':
      return value !== filterValue;
    
    case 'contains':
      // Case-insensitive contains for strings
      return String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
    
    case 'in':
      // filterValue should be an array, check if value is in array
      return Array.isArray(filterValue) && filterValue.includes(value);
    
    case 'is_empty':
      return value === null || value === undefined || value === '';
    
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    
    default:
      // Unknown operator, return true to avoid filtering out items
      return true;
  }
}

/**
 * Apply multiple filter conditions to a dataset using AND logic
 * 
 * @param data - Array of items to filter
 * @param filters - Array of filter conditions to apply
 * @returns Filtered array containing only items that match ALL filter conditions
 * 
 * Requirements: 6.8, 6.12, 14.8
 */
export function applyFilters(data: any[], filters: FilterCondition[]): any[] {
  // If no filters, return original data
  if (!filters || filters.length === 0) {
    return data;
  }

  // Apply all filters using AND logic
  return data.filter((item) => {
    // Item must match ALL filter conditions
    return filters.every((filter) => {
      // Get the value of the field to filter on
      const value = item[filter.field];

      // Handle invalid filter values (skip the filter)
      if (
        filter.value === null ||
        filter.value === undefined
      ) {
        // Only operators that don't need a value are valid
        if (filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty') {
          console.warn('[ViewDataProcessing] Invalid filter value, skipping filter', {
            filter,
          });
          return true; // Skip this filter, don't exclude the item
        }
      }

      // Apply the filter operator
      return applyFilterOperator(value, filter.operator, filter.value);
    });
  });
}

// ============================================================================
// Sort Functions
// ============================================================================

/**
 * Compare two values for sorting with null handling and type coercion
 * 
 * Handles:
 * - Null/undefined values (sorted to end for asc, beginning for desc)
 * - Numbers (including progress percentages like "75%")
 * - Strings (case-insensitive comparison)
 * 
 * @param a - First value to compare
 * @param b - Second value to compare
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Negative if a < b, positive if a > b, zero if equal
 * 
 * Requirements: 7.6, 7.7
 */
export function compareValues(a: any, b: any, direction: 'asc' | 'desc'): number {
  // Handle null/undefined - always sort to end for asc, beginning for desc
  if (a === null || a === undefined) {
    return direction === 'asc' ? 1 : -1;
  }
  if (b === null || b === undefined) {
    return direction === 'asc' ? -1 : 1;
  }

  // Try to parse as numbers (including percentages like "75%")
  const aNum = typeof a === 'string' ? parseFloat(a.replace('%', '')) : a;
  const bNum = typeof b === 'string' ? parseFloat(b.replace('%', '')) : b;

  // If both are valid numbers, compare numerically
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return direction === 'asc' ? aNum - bNum : bNum - aNum;
  }

  // Otherwise, compare as strings (case-insensitive)
  const aStr = String(a).toLowerCase();
  const bStr = String(b).toLowerCase();

  if (direction === 'asc') {
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  } else {
    return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
  }
}

/**
 * Apply multiple sort rules to a dataset
 * 
 * Sorts are applied in sequence: primary sort first, then secondary for ties, etc.
 * The sort is stable: items equal on all sort fields maintain their original relative order.
 * 
 * @param data - Array of items to sort
 * @param sorts - Array of sort rules to apply (in priority order)
 * @returns Sorted array (does not modify original array)
 * 
 * Requirements: 7.7, 7.12
 */
export function applySorts(data: any[], sorts: SortRule[]): any[] {
  // If no sorts, return original data
  if (!sorts || sorts.length === 0) {
    return data;
  }

  // Create a copy to avoid mutating the original array
  const sorted = [...data];

  // Sort using a comparison function that applies all sort rules
  sorted.sort((a, b) => {
    // Apply each sort rule in sequence
    for (const sort of sorts) {
      // Handle invalid sort fields (skip the sort)
      if (!(sort.field in a) || !(sort.field in b)) {
        console.warn('[ViewDataProcessing] Invalid sort field, skipping sort', {
          sort,
        });
        continue;
      }

      // Get the values to compare
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      // Compare the values
      const comparison = compareValues(aValue, bValue, sort.direction);

      // If not equal, return the comparison result
      if (comparison !== 0) {
        return comparison;
      }

      // If equal, continue to the next sort rule
    }

    // All sort rules resulted in equality, maintain original order (stable sort)
    return 0;
  });

  return sorted;
}

// ============================================================================
// Grouping Functions
// ============================================================================

/**
 * Group tasks by project_id
 * 
 * Creates TaskGroup objects with:
 * - projectId: The project_id value
 * - projectName: The project name (looked up from projects data)
 * - tasks: Array of tasks belonging to this project
 * - isCollapsed: Whether the group is collapsed (from collapsedGroups array)
 * 
 * Groups are sorted by project_id in ascending order.
 * Tasks without a project_id are placed in an "Unassigned" group at the end.
 * 
 * @param tasks - Array of tasks to group
 * @param projects - Array of projects (for looking up project names)
 * @param collapsedGroups - Array of project_ids that should be collapsed
 * @returns Array of TaskGroup objects sorted by project_id
 * 
 * Requirements: 8.3, 8.4, 8.6, 8.7
 */
export function applyGrouping(
  tasks: any[],
  projects: any[],
  collapsedGroups: string[] = []
): TaskGroup[] {
  // Create a map of project_id to project_name for quick lookup
  const projectNameMap = new Map<string, string>();
  for (const project of projects) {
    projectNameMap.set(project.project_id, project.project_name);
  }

  // Group tasks by project_id
  const groupMap = new Map<string, any[]>();
  const unassignedTasks: any[] = [];

  for (const task of tasks) {
    const projectId = task.project_id;

    // Handle tasks without project_id (Unassigned group)
    if (!projectId || projectId === '') {
      unassignedTasks.push(task);
      continue;
    }

    // Add task to the appropriate group
    if (!groupMap.has(projectId)) {
      groupMap.set(projectId, []);
    }
    groupMap.get(projectId)!.push(task);
  }

  // Convert map to array of TaskGroup objects
  const groups: TaskGroup[] = [];

  // Sort project_ids in ascending order
  const sortedProjectIds = Array.from(groupMap.keys()).sort();

  for (const projectId of sortedProjectIds) {
    const projectTasks = groupMap.get(projectId)!;
    const projectName = projectNameMap.get(projectId) || projectId; // Fallback to ID if name not found

    groups.push({
      projectId,
      projectName,
      tasks: projectTasks,
      isCollapsed: collapsedGroups.includes(projectId),
    });
  }

  // Add "Unassigned" group at the end if there are unassigned tasks
  if (unassignedTasks.length > 0) {
    groups.push({
      projectId: 'unassigned',
      projectName: 'Unassigned',
      tasks: unassignedTasks,
      isCollapsed: collapsedGroups.includes('unassigned'),
    });
  }

  return groups;
}
