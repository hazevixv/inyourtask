'use client';

/**
 * ViewSystem Component
 * 
 * Central controller for view state and data processing.
 * Manages layout modes, view preferences, and coordinates between
 * layout renderers and settings panel.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 10.1, 10.2, 10.3, 10.4, 10.5
 * Requirements: 6.1, 6.2, 6.3, 6.8, 6.9, 6.10, 6.11, 6.12 (Task 2.2)
 * Requirements: 7.1, 7.2, 7.3, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12 (Task 2.3)
 * Requirements: 2.1, 2.2, 2.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7 (Task 2.4)
 * Requirements: 11.1, 11.2, 11.3, 11.4 (Task 11 - Accessibility)
 * Requirements: 12.2, 12.3, 12.5 (Task 12 - Performance)
 * Requirements: 13.1, 13.2, 13.3, 13.4 (Task 13 - Error Handling)
 */

import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import {
  ViewPreferences,
  FilterCondition,
  SortRule,
  loadViewPreferences,
  saveViewPreferences,
  getDefaultPreferences,
  STORAGE_KEYS,
} from '@/lib/viewPersistence';
import {
  applyFilters,
  applySorts,
  applyGrouping,
  TaskGroup,
} from '@/lib/viewDataProcessing';
import ViewToolbar from './ViewToolbar';
import TableLayout from './layouts/TableLayout';
import ListLayout from './layouts/ListLayout';
import styles from './ViewSystem.module.css';

// Lazy load ViewSettingsPanel for performance - Requirements: 12.3
const ViewSettingsPanel = lazy(() => import('./ViewSettingsPanel'));

// ============================================================================
// Type Definitions
// ============================================================================

interface ViewSystemProps {
  type: 'tasks' | 'projects';
  data: any[];
  projects?: any[]; // For grouping tasks by project
  currentUser?: string;
  mobileFilter: 'all' | 'mine'; // From MobileHeader
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// ============================================================================
// ViewSystem Component
// ============================================================================

export default function ViewSystem({
  type,
  data,
  projects = [],
  currentUser,
  mobileFilter,
  onEdit,
  onDelete,
}: ViewSystemProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * View preferences state with lazy initialization from localStorage
   * Requirements: 1.3, 10.1, 10.4
   */
  const [preferences, setPreferences] = useState<ViewPreferences>(() => {
    // Lazy initialization: load from localStorage on mount
    const storageKey = type === 'tasks' ? STORAGE_KEYS.TASKS : STORAGE_KEYS.PROJECTS;
    const loaded = loadViewPreferences(storageKey);
    
    // Fall back to defaults if null (invalid or missing)
    if (loaded === null) {
      return getDefaultPreferences(type);
    }
    
    return loaded;
  });

  /**
   * Settings panel open/closed state
   * Requirements: 1.2
   */
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  /**
   * localStorage availability state
   * Requirements: 13.1
   */
  const [localStorageAvailable, setLocalStorageAvailable] = useState(true);

  /**
   * Error state for data processing
   * Requirements: 13.2, 13.4
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * Announcement for screen readers
   * Requirements: 11.2 - ARIA live regions
   */
  const [announcement, setAnnouncement] = useState<string>('');

  // ============================================================================
  // Data Processing
  // ============================================================================

  /**
   * Process data through filters, sorts, and grouping
   * Requirements: 6.8, 6.12, 7.7, 7.12, 8.3, 8.4, 8.6, 8.7
   * Requirements: 13.2 - Error handling for data processing
   */
  const processedData = useMemo(() => {
    try {
      // Step 1: Apply filters
      let filtered = applyFilters(data, preferences.filters);

      // Step 2: Apply sorts
      let sorted = applySorts(filtered, preferences.sorts);

      // Step 3: Apply grouping (Tasks only)
      if (type === 'tasks' && preferences.groupBy === 'project') {
        const grouped = applyGrouping(sorted, projects, preferences.collapsedGroups || []);
        return grouped;
      }

      return sorted;
    } catch (err) {
      console.error('[ViewSystem] Error processing data:', err);
      setError('Failed to process data. Please try refreshing the page.');
      return [];
    }
  }, [data, projects, preferences.filters, preferences.sorts, preferences.groupBy, preferences.collapsedGroups, type]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Load preferences from localStorage on mount
   * Requirements: 1.4, 10.4, 13.1 - localStorage error handling
   */
  useEffect(() => {
    try {
      const storageKey = type === 'tasks' ? STORAGE_KEYS.TASKS : STORAGE_KEYS.PROJECTS;
      const loaded = loadViewPreferences(storageKey);
      
      if (loaded !== null) {
        setPreferences(loaded);
      } else {
        // Use defaults if loading failed
        setPreferences(getDefaultPreferences(type));
      }
      setLocalStorageAvailable(true);
    } catch (err) {
      console.error('[ViewSystem] localStorage unavailable:', err);
      setLocalStorageAvailable(false);
      setPreferences(getDefaultPreferences(type));
    }
  }, [type]);

  /**
   * Save preferences to localStorage whenever they change
   * Requirements: 1.3, 10.3, 10.5, 12.5 - Optimized localStorage operations
   * Requirements: 13.1 - localStorage error handling
   * 
   * Debounced to 100ms to avoid excessive writes while maintaining
   * the requirement of saving within 100ms of changes.
   */
  useEffect(() => {
    if (!localStorageAvailable) return;

    const storageKey = type === 'tasks' ? STORAGE_KEYS.TASKS : STORAGE_KEYS.PROJECTS;
    
    // Debounce save operation by 100ms - Requirements: 12.5
    const timeoutId = setTimeout(() => {
      try {
        const success = saveViewPreferences(storageKey, preferences);
        
        if (!success) {
          console.error('[ViewSystem] Failed to save preferences to localStorage');
          setLocalStorageAvailable(false);
        }
      } catch (err) {
        console.error('[ViewSystem] Error saving preferences:', err);
        setLocalStorageAvailable(false);
      }
    }, 100);

    // Cleanup timeout on unmount or when preferences change again
    return () => clearTimeout(timeoutId);
  }, [preferences, type, localStorageAvailable]);

  /**
   * Announce changes to screen readers
   * Requirements: 11.2 - ARIA live regions
   */
  useEffect(() => {
    const filterCount = preferences.filters.length;
    const sortCount = preferences.sorts.length;
    const resultCount = Array.isArray(processedData) ? processedData.length : 0;
    
    let message = `Showing ${resultCount} ${type}`;
    if (filterCount > 0) message += ` with ${filterCount} filter${filterCount > 1 ? 's' : ''}`;
    if (sortCount > 0) message += ` and ${sortCount} sort${sortCount > 1 ? 's' : ''}`;
    
    setAnnouncement(message);
    
    // Clear announcement after 1 second
    const timeout = setTimeout(() => setAnnouncement(''), 1000);
    return () => clearTimeout(timeout);
  }, [preferences.filters.length, preferences.sorts.length, processedData, type]);

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Load preferences from localStorage
   * Requirements: 10.4
   */
  const loadPreferencesMethod = () => {
    const storageKey = type === 'tasks' ? STORAGE_KEYS.TASKS : STORAGE_KEYS.PROJECTS;
    const loaded = loadViewPreferences(storageKey);
    
    if (loaded !== null) {
      setPreferences(loaded);
    }
  };

  /**
   * Save preferences to localStorage immediately
   * Requirements: 10.3
   */
  const savePreferencesMethod = (prefs: ViewPreferences) => {
    const storageKey = type === 'tasks' ? STORAGE_KEYS.TASKS : STORAGE_KEYS.PROJECTS;
    const success = saveViewPreferences(storageKey, prefs);
    
    if (success) {
      setPreferences(prefs);
    } else {
      console.error('[ViewSystem] Failed to save preferences');
    }
  };

  /**
   * Toggle between table and list layouts
   * Requirements: 1.2, 1.7, 12.2 - useCallback for performance
   */
  const toggleLayout = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      layout: prev.layout === 'table' ? 'list' : 'table',
    }));
  }, []);

  /**
   * Update visible columns
   * Requirements: 1.1, 12.2 - useCallback for performance
   */
  const updateVisibleColumns = useCallback((columns: string[]) => {
    setPreferences((prev) => ({
      ...prev,
      visibleColumns: columns,
    }));
  }, []);

  /**
   * Add a filter condition
   * Requirements: 6.1, 6.2, 6.3, 12.2 - useCallback for performance
   */
  const addFilter = useCallback((condition: FilterCondition) => {
    setPreferences((prev) => ({
      ...prev,
      filters: [...prev.filters, condition],
    }));
  }, []);

  /**
   * Remove a filter condition by ID
   * Requirements: 6.9, 6.10, 12.2 - useCallback for performance
   */
  const removeFilter = useCallback((id: string) => {
    setPreferences((prev) => ({
      ...prev,
      filters: prev.filters.filter((f) => f.id !== id),
    }));
  }, []);

  /**
   * Update a filter condition
   * Requirements: 6.11, 12.2 - useCallback for performance
   */
  const updateFilter = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setPreferences((prev) => ({
      ...prev,
      filters: prev.filters.map((f) => 
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  /**
   * Add a sort rule
   * Requirements: 7.1, 7.2, 7.3, 12.2 - useCallback for performance
   */
  const addSort = useCallback((rule: SortRule) => {
    setPreferences((prev) => ({
      ...prev,
      sorts: [...prev.sorts, rule],
    }));
  }, []);

  /**
   * Remove a sort rule by ID
   * Requirements: 7.8, 7.9, 12.2 - useCallback for performance
   */
  const removeSort = useCallback((id: string) => {
    setPreferences((prev) => ({
      ...prev,
      sorts: prev.sorts.filter((s) => s.id !== id),
    }));
  }, []);

  /**
   * Update a sort rule
   * Requirements: 7.10, 12.2 - useCallback for performance
   */
  const updateSort = useCallback((id: string, updates: Partial<SortRule>) => {
    setPreferences((prev) => ({
      ...prev,
      sorts: prev.sorts.map((s) => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  /**
   * Set grouping mode (Tasks only)
   * Requirements: 8.1, 8.2, 8.5, 12.2 - useCallback for performance
   */
  const setGroupBy = useCallback((value: 'project' | null) => {
    setPreferences((prev) => ({
      ...prev,
      groupBy: value,
    }));
  }, []);

  /**
   * Toggle group collapsed state
   * Requirements: 2.2, 2.8, 8.3, 8.4, 12.2 - useCallback for performance
   */
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setPreferences((prev) => {
      const collapsedGroups = prev.collapsedGroups || [];
      const isCollapsed = collapsedGroups.includes(groupId);
      
      return {
        ...prev,
        collapsedGroups: isCollapsed
          ? collapsedGroups.filter((id) => id !== groupId)
          : [...collapsedGroups, groupId],
      };
    });
  }, []);

  /**
   * Handle edit action with error handling
   * Requirements: 13.4 - Integration error handling
   */
  const handleEdit = useCallback((id: string) => {
    try {
      onEdit(id);
    } catch (err) {
      console.error('[ViewSystem] Error opening editor:', err);
      setError('Failed to open editor. Please try again.');
    }
  }, [onEdit]);

  /**
   * Handle delete action with error handling
   * Requirements: 13.4 - Integration error handling
   */
  const handleDelete = useCallback((id: string) => {
    try {
      onDelete(id);
    } catch (err) {
      console.error('[ViewSystem] Error deleting item:', err);
      setError('Failed to delete item. Please try again.');
    }
  }, [onDelete]);

  /**
   * Clear all filters
   * Requirements: 13.3 - Empty state handling
   */
  const clearFilters = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      filters: [],
    }));
  }, []);

  /**
   * Update preferences from settings panel
   * Requirements: 4.10, 8.7, 12.2 - useCallback for performance
   */
  const handlePreferencesUpdate = useCallback((newPrefs: ViewPreferences) => {
    setPreferences(newPrefs);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  /**
   * Check if data is empty after processing
   * Requirements: 13.3 - Empty state handling
   */
  const isEmpty = useMemo(() => {
    if (!processedData || processedData.length === 0) return true;
    
    // For grouped data, check if all groups are empty
    if (type === 'tasks' && preferences.groupBy === 'project' && Array.isArray(processedData)) {
      const groups = processedData as TaskGroup[];
      return groups.every((group) => group.tasks.length === 0);
    }
    
    return false;
  }, [processedData, type, preferences.groupBy]);

  /**
   * Determine if data is grouped
   * Requirements: 2.1, 8.4
   */
  const isGrouped = type === 'tasks' && preferences.groupBy === 'project';

  return (
    <div className={styles.viewSystem}>
      {/* ARIA live region for screen reader announcements - Requirements: 11.2 */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* ViewToolbar - Requirements: 1.1, 1.2, 1.5, 1.6, 4.1 */}
      <ViewToolbar
        layout={preferences.layout}
        onLayoutToggle={toggleLayout}
        onOpenSettings={() => setSettingsPanelOpen(true)}
      />

      {/* localStorage warning - Requirements: 13.1 */}
      {!localStorageAvailable && (
        <div 
          className={styles.warning}
          role="alert"
          aria-live="polite"
        >
          Settings cannot be saved (localStorage unavailable)
        </div>
      )}

      {/* Error state - Requirements: 13.2, 13.4 */}
      {error && (
        <div className={styles.errorState}>
          <div className={styles.errorContent}>
            <p className={styles.errorMessage}>{error}</p>
            <button
              className={styles.retryBtn}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* View Content - Requirements: 1.1, 1.2, 2.1, 3.1 */}
      <div className={styles.viewContent}>
        {isEmpty ? (
          // Empty state - Requirements: 13.3
          <div className={styles.emptyState}>
            <div className={styles.emptyContent}>
              <p className={styles.emptyMessage}>No items match your filters</p>
              <p className={styles.emptyHint}>
                Try adjusting your filters or create a new {type === 'tasks' ? 'task' : 'project'}
              </p>
              {preferences.filters.length > 0 && (
                <button
                  className={styles.clearFiltersBtn}
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : preferences.layout === 'table' ? (
          // Table Layout - Requirements: 1.1, 5.9, 5.10
          <TableLayout
            type={type}
            data={processedData as any[]}
            visibleColumns={preferences.visibleColumns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          // List Layout - Requirements: 1.2, 2.1, 2.4, 3.1
          <ListLayout
            type={type}
            data={processedData as any[]}
            visibleColumns={preferences.visibleColumns}
            isGrouped={isGrouped}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleGroup={toggleGroupCollapse}
          />
        )}
      </div>

      {/* ViewSettingsPanel - Lazy loaded - Requirements: 4.1, 8.1, 12.3 */}
      {settingsPanelOpen && (
        <Suspense fallback={
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} aria-label="Loading settings panel" />
          </div>
        }>
          <ViewSettingsPanel
            type={type}
            preferences={preferences}
            onUpdate={handlePreferencesUpdate}
            onClose={() => setSettingsPanelOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
