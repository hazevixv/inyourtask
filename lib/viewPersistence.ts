/**
 * View Persistence Manager
 * 
 * Handles all localStorage operations for view preferences with comprehensive error handling.
 * Supports separate configurations for Tasks and Projects pages.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10,
 *               14.1, 14.2, 14.3, 16.1, 16.2, 16.3, 16.4, 16.6, 16.7, 16.9, 16.10
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Filter condition structure for data filtering
 */
export interface FilterCondition {
  id: string; // Unique identifier for removal
  field: string; // Property name to filter on
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'is_empty' | 'is_not_empty';
  value?: any; // Value to compare against (not needed for is_empty/is_not_empty)
}

/**
 * Sort rule structure for data ordering
 */
export interface SortRule {
  id: string; // Unique identifier for removal
  field: string; // Property name to sort by
  direction: 'asc' | 'desc';
}

/**
 * Complete view preferences data structure
 */
export interface ViewPreferences {
  layout: 'table' | 'list';
  visibleColumns: string[];
  filters: FilterCondition[];
  sorts: SortRule[];
  groupBy?: 'project' | null; // Tasks only
  collapsedGroups?: string[]; // Group IDs that are collapsed
}

// ============================================================================
// Constants
// ============================================================================

/**
 * localStorage keys for view settings
 */
export const STORAGE_KEYS = {
  TASKS: 'tasks-view-settings',
  PROJECTS: 'projects-view-settings',
} as const;

/**
 * Default visible columns for Tasks page
 */
const DEFAULT_TASKS_COLUMNS = [
  'name',
  'status',
  'priority',
  'progress',
  'due_date',
  'assignees',
  'notes',
  'brief',
  'url',
  'project_id',
];

/**
 * Default visible columns for Projects page
 */
const DEFAULT_PROJECTS_COLUMNS = [
  'name',
  'category',
  'status',
  'progress',
  'task_count',
  'assignees',
  'owner',
  'notes',
  'brief',
  'url',
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Load view preferences from localStorage
 * 
 * @param key - localStorage key ('tasks-view-settings' or 'projects-view-settings')
 * @returns Parsed preferences object or null if invalid/missing
 * 
 * Requirements: 10.4, 10.6, 14.3, 16.2, 16.3
 */
export function loadViewPreferences(key: string): ViewPreferences | null {
  try {
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[ViewPersistence] localStorage is not available');
      return null;
    }

    // Attempt to retrieve the item
    const stored = localStorage.getItem(key);
    
    // Return null if key doesn't exist
    if (!stored) {
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(stored);

    // Validate structure
    if (!validatePreferences(parsed)) {
      console.error('[ViewPersistence] Invalid preferences structure, using defaults', {
        key,
        parsed,
      });
      return null;
    }

    return parsed as ViewPreferences;
  } catch (error) {
    // Handle JSON parse errors or other exceptions
    if (error instanceof SyntaxError) {
      console.error('[ViewPersistence] Corrupted data (invalid JSON)', {
        key,
        error: error.message,
      });
    } else {
      console.error('[ViewPersistence] Failed to load preferences', {
        key,
        error,
      });
    }
    return null;
  }
}

/**
 * Save view preferences to localStorage
 * 
 * @param key - localStorage key ('tasks-view-settings' or 'projects-view-settings')
 * @param prefs - ViewPreferences object to save
 * @returns true if save succeeded, false otherwise
 * 
 * Requirements: 10.3, 10.7, 14.2, 16.1, 16.4
 */
export function saveViewPreferences(key: string, prefs: ViewPreferences): boolean {
  try {
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[ViewPersistence] localStorage is not available, cannot save');
      return false;
    }

    // Validate preferences before saving
    if (!validatePreferences(prefs)) {
      console.error('[ViewPersistence] Cannot save invalid preferences', {
        key,
        prefs,
      });
      return false;
    }

    // Serialize to JSON
    const serialized = JSON.stringify(prefs);

    // Attempt to save
    localStorage.setItem(key, serialized);

    return true;
  } catch (error) {
    // Handle quota exceeded errors
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      console.warn('[ViewPersistence] Storage quota exceeded, attempting recovery', {
        key,
      });
      handleQuotaExceeded(key);
      
      // Retry save after clearing old data
      try {
        const serialized = JSON.stringify(prefs);
        localStorage.setItem(key, serialized);
        console.info('[ViewPersistence] Save succeeded after quota recovery');
        return true;
      } catch (retryError) {
        console.error('[ViewPersistence] Save failed even after quota recovery', {
          key,
          error: retryError,
        });
        return false;
      }
    }

    console.error('[ViewPersistence] Failed to save preferences', {
      key,
      error,
    });
    return false;
  }
}

/**
 * Validate preferences structure
 * 
 * Ensures that the preferences object has all required fields with correct types.
 * 
 * @param prefs - Object to validate
 * @returns true if valid, false otherwise
 * 
 * Requirements: 10.8, 16.6, 16.7, 16.9, 16.10
 */
export function validatePreferences(prefs: any): boolean {
  if (!prefs || typeof prefs !== 'object') {
    return false;
  }

  // Validate layout field (required)
  if (prefs.layout !== 'table' && prefs.layout !== 'list') {
    return false;
  }

  // Validate visibleColumns field (required, must be array of strings)
  if (!Array.isArray(prefs.visibleColumns)) {
    return false;
  }
  if (!prefs.visibleColumns.every((col: any) => typeof col === 'string')) {
    return false;
  }

  // Validate filters field (required, must be array)
  if (!Array.isArray(prefs.filters)) {
    return false;
  }
  // Validate each filter condition
  for (const filter of prefs.filters) {
    if (!filter || typeof filter !== 'object') {
      return false;
    }
    if (typeof filter.id !== 'string' || typeof filter.field !== 'string') {
      return false;
    }
    const validOperators = ['equals', 'not_equals', 'contains', 'in', 'is_empty', 'is_not_empty'];
    if (!validOperators.includes(filter.operator)) {
      return false;
    }
  }

  // Validate sorts field (required, must be array)
  if (!Array.isArray(prefs.sorts)) {
    return false;
  }
  // Validate each sort rule
  for (const sort of prefs.sorts) {
    if (!sort || typeof sort !== 'object') {
      return false;
    }
    if (typeof sort.id !== 'string' || typeof sort.field !== 'string') {
      return false;
    }
    if (sort.direction !== 'asc' && sort.direction !== 'desc') {
      return false;
    }
  }

  // Validate optional groupBy field
  if (prefs.groupBy !== undefined && prefs.groupBy !== null && prefs.groupBy !== 'project') {
    return false;
  }

  // Validate optional collapsedGroups field
  if (prefs.collapsedGroups !== undefined) {
    if (!Array.isArray(prefs.collapsedGroups)) {
      return false;
    }
    if (!prefs.collapsedGroups.every((id: any) => typeof id === 'string')) {
      return false;
    }
  }

  return true;
}

/**
 * Get default preferences for a page type
 * 
 * @param type - Page type ('tasks' or 'projects')
 * @returns Default ViewPreferences object
 * 
 * Requirements: 10.9, 10.10
 */
export function getDefaultPreferences(type: 'tasks' | 'projects'): ViewPreferences {
  if (type === 'tasks') {
    return {
      layout: 'table',
      visibleColumns: [...DEFAULT_TASKS_COLUMNS],
      filters: [],
      sorts: [],
      groupBy: null, // Changed from 'project' to null for initial view
      collapsedGroups: [],
    };
  } else {
    return {
      layout: 'table',
      visibleColumns: [...DEFAULT_PROJECTS_COLUMNS],
      filters: [],
      sorts: [],
      collapsedGroups: [],
    };
  }
}

/**
 * Handle quota exceeded errors by clearing old data
 * 
 * Attempts to free up space by removing view settings data.
 * This is called automatically when a QuotaExceededError occurs.
 * 
 * @param currentKey - The key that failed to save (will be preserved if possible)
 * 
 * Requirements: 10.7, 14.2
 */
export function handleQuotaExceeded(currentKey: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    console.info('[ViewPersistence] Clearing old data to free up storage space');

    // Get all view settings keys
    const allKeys = Object.values(STORAGE_KEYS);

    // Clear other view settings keys (not the current one)
    for (const key of allKeys) {
      if (key !== currentKey) {
        try {
          localStorage.removeItem(key);
          console.info(`[ViewPersistence] Cleared old data: ${key}`);
        } catch (error) {
          console.error(`[ViewPersistence] Failed to clear ${key}`, error);
        }
      }
    }

    // If we still need more space, clear the current key as well
    // (it will be re-saved with new data)
    try {
      localStorage.removeItem(currentKey);
      console.info(`[ViewPersistence] Cleared current key: ${currentKey}`);
    } catch (error) {
      console.error(`[ViewPersistence] Failed to clear ${currentKey}`, error);
    }
  } catch (error) {
    console.error('[ViewPersistence] Error during quota exceeded handling', error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if localStorage is available
 * 
 * @returns true if localStorage is available and functional
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    // Test if we can actually use it
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all view preferences from localStorage
 * 
 * Useful for testing or resetting to defaults.
 */
export function clearAllViewPreferences(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const allKeys = Object.values(STORAGE_KEYS);
    for (const key of allKeys) {
      localStorage.removeItem(key);
    }

    console.info('[ViewPersistence] Cleared all view preferences');
  } catch (error) {
    console.error('[ViewPersistence] Failed to clear all preferences', error);
  }
}
