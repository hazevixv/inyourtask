# Implementation Plan: Notion-Style Views for Tasks and Projects

## Overview

This implementation plan breaks down the Notion-style view system into discrete, actionable coding tasks. The system adds flexible multi-layout data presentation (Table and List views) with advanced customization through property visibility controls, filtering, sorting, and grouping. The implementation follows a 5-layer architecture: Page Layer, View Controller, Layout Renderer, Settings Panel, and Persistence Manager.

The approach prioritizes building core infrastructure first (persistence, view controller), then implementing layouts, followed by the settings panel and advanced features. Each task builds incrementally with validation checkpoints to ensure stability.

## Tasks

- [x] 1. Set up core infrastructure and persistence layer
  - [x] 1.1 Create persistence manager module with localStorage operations
    - Create `lib/viewPersistence.ts` with functions: `loadViewPreferences`, `saveViewPreferences`, `validatePreferences`, `getDefaultPreferences`, `handleQuotaExceeded`
    - Implement error handling for unavailable localStorage, corrupted data, and quota exceeded
    - Add TypeScript interfaces for `ViewPreferences`, `FilterCondition`, `SortRule`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 14.1, 14.2, 14.3, 16.1, 16.2, 16.3, 16.4, 16.6, 16.7, 16.9, 16.10_

  - [ ]* 1.2 Write property test for serialization round-trip
    - **Property 1: View Preferences Serialization Round-Trip**
    - **Validates: Requirements 1.3, 2.8, 5.8, 6.11, 7.10, 16.5**
    - Test that `parse(serialize(preferences))` equals original preferences
    - Use fast-check to generate random ViewPreferences objects
    - Verify all fields preserved: layout, visibleColumns, filters, sorts, groupBy, collapsedGroups

  - [x] 1.3 Create data processing utility functions
    - Create `lib/viewDataProcessing.ts` with functions: `applyFilters`, `applySorts`, `applyGrouping`, `applyFilterOperator`, `compareValues`
    - Implement filter operators: equals, not_equals, contains, in, is_empty, is_not_empty
    - Implement sort comparison logic with null handling and type coercion
    - Implement task grouping by project_id with "Unassigned" group handling
    - _Requirements: 6.7, 6.8, 6.12, 7.6, 7.7, 7.12, 8.3, 8.4, 8.6, 8.7, 14.8_

  - [ ]* 1.4 Write property tests for filter logic
    - **Property 3: Filter Application Produces Valid Subset**
    - **Validates: Requirements 6.8**
    - Test that filtered result is subset of original (len(filtered) <= len(original))
    - Test that all filtered items satisfy the filter condition
    - **Property 4: Multiple Filters Use AND Logic**
    - **Validates: Requirements 6.12**
    - Test that multiple filters produce intersection of individual filter results
    - **Property 10: Filter Idempotence**
    - **Validates: Requirements 6.8**
    - Test that `filter(filter(data, condition), condition)` equals `filter(data, condition)`

  - [ ]* 1.5 Write property tests for sort logic
    - **Property 5: Sort Order Satisfaction**
    - **Validates: Requirements 7.7**
    - Test that sorted result satisfies order constraint (item[i] <= item[i+1] for asc)
    - **Property 6: Sort Preserves All Items**
    - **Validates: Requirements 7.7**
    - Test that sorting preserves all items (same length, same items as set)
    - **Property 7: Multi-Level Sort Stability**
    - **Validates: Requirements 7.11, 7.12**
    - Test that secondary sort only affects items equal on primary sort
    - **Property 11: Sort Idempotence**
    - **Validates: Requirements 7.7**
    - Test that `sort(sort(data, rule), rule)` equals `sort(data, rule)`

  - [ ]* 1.6 Write property tests for grouping logic
    - **Property 8: Task Grouping Completeness and Disjointness**
    - **Validates: Requirements 2.1, 2.10, 8.6, 8.7**
    - Test that union of all groups equals original task list (completeness)
    - Test that no task appears in multiple groups (disjointness)
    - Test that all tasks in a group have same project_id (invariant)
    - Test that groups are sorted by project_id ascending

- [x] 2. Implement ViewSystem controller component
  - [x] 2.1 Create ViewSystem component with state management
    - Create `components/ViewSystem.tsx` with props: type, data, currentUser, mobileFilter, onEdit, onDelete
    - Implement state: preferences (ViewPreferences), settingsPanelOpen (boolean)
    - Add useEffect to load preferences from localStorage on mount
    - Add useEffect to save preferences to localStorage on changes
    - Implement methods: loadPreferences, savePreferences, toggleLayout, updateVisibleColumns
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.2 Add filter management methods to ViewSystem
    - Implement methods: addFilter, removeFilter, updateFilter
    - Integrate with applyFilters utility function
    - Add state for processed data after filters applied
    - _Requirements: 6.1, 6.2, 6.3, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 2.3 Add sort management methods to ViewSystem
    - Implement methods: addSort, removeSort, updateSort
    - Integrate with applySorts utility function
    - Apply sorts to filtered data
    - _Requirements: 7.1, 7.2, 7.3, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

  - [x] 2.4 Add grouping management methods to ViewSystem (Tasks only)
    - Implement methods: setGroupBy, toggleGroupCollapse
    - Integrate with applyGrouping utility function
    - Apply grouping to sorted data
    - _Requirements: 2.1, 2.2, 2.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 2.5 Implement ViewToolbar sub-component
    - Create toolbar with layout toggle button (Table/List icons)
    - Add "View Settings" button to open settings panel
    - Display active layout mode indicator
    - Make toolbar responsive for mobile and desktop
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 4.1_

  - [ ]* 2.6 Write unit tests for ViewSystem component
    - Test preferences loading from localStorage on mount
    - Test preferences saving to localStorage on changes
    - Test layout toggle switches between table and list
    - Test filter add/remove updates processed data
    - Test sort add/remove updates processed data
    - Test grouping toggle updates processed data (Tasks only)

  - [ ]* 2.7 Write property test for layout switching preserves settings
    - **Property 2: Layout Switching Preserves Settings**
    - **Validates: Requirements 1.7**
    - Test that switching layout preserves filters, sorts, groupBy, collapsedGroups, visibleColumns

- [x] 3. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement TableLayout component
  - [x] 4.1 Create TableLayout wrapper component
    - Create `components/layouts/TableLayout.tsx` with props: type, data, visibleColumns, onEdit, onDelete
    - Wrap existing DataTable component
    - Filter table columns based on visibleColumns prop
    - Pass through onEdit and onDelete callbacks
    - _Requirements: 5.9, 5.10_

  - [x] 4.2 Enhance DataTable to support dynamic column visibility
    - Modify existing `components/DataTable.tsx` (or create enhanced version)
    - Accept visibleColumns prop to control which columns render
    - Ensure name column always renders (cannot be hidden)
    - Maintain existing functionality: sorting, row selection, quick actions
    - _Requirements: 5.5, 5.7, 14.6_

  - [ ]* 4.3 Write unit tests for TableLayout
    - Test that only visible columns are rendered
    - Test that name column always renders
    - Test that onEdit callback triggers correctly
    - Test that onDelete callback triggers correctly

- [x] 5. Implement ListLayout component for Tasks
  - [x] 5.1 Create TaskListItem component
    - Create `components/layouts/TaskListItem.tsx` with props: task, visibleColumns, onEdit, onDelete
    - Display task_name, Status_Badge, Priority_Badge, progress percentage, due_date, Assignee_List
    - Add checkbox for completion status (checked when status is "Done")
    - Add Quick_Actions buttons (edit, delete) with 44x44px touch targets
    - Apply hover effect: background rgba(124, 58, 237, 0.08)
    - Make entire row clickable to open edit modal
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 9.3, 9.8, 12.2, 12.4, 12.6, 12.8, 12.9_

  - [x] 5.2 Create TaskGroupList component
    - Create `components/layouts/TaskGroupList.tsx` with props: groups, visibleColumns, onEdit, onDelete, onToggleGroup
    - Render collapsible group headers with project_id, project_name, task count
    - Display TaskListItem components for each task in group
    - Implement collapse/expand animation (200ms transition)
    - Sort groups by project_id ascending
    - Hide empty groups (no tasks after filtering)
    - _Requirements: 2.1, 2.2, 2.3, 2.9, 2.10, 8.7, 12.2, 12.3, 12.7, 14.5_

  - [x] 5.3 Create ListLayout component for Tasks
    - Create `components/layouts/ListLayout.tsx` with props: type, data, visibleColumns, isGrouped, onEdit, onDelete, onToggleGroup
    - Conditionally render TaskGroupList (when isGrouped=true) or flat TaskListItem list (when isGrouped=false)
    - Implement virtualization using react-window for 50+ items
    - Handle empty state: "No items match your filters" with "Clear filters" button
    - _Requirements: 2.1, 2.4, 3.1, 8.4, 9.4, 9.7, 11.1, 11.8, 14.4_

  - [ ]* 5.4 Write unit tests for TaskListItem
    - Test that all visible properties render correctly
    - Test that checkbox reflects completion status
    - Test that Quick_Actions trigger callbacks
    - Test that row click triggers onEdit
    - Test hover effect applies correctly

  - [ ]* 5.5 Write unit tests for TaskGroupList
    - Test that groups render with correct headers
    - Test that group collapse/expand works
    - Test that empty groups are hidden
    - Test that groups are sorted by project_id

- [x] 6. Implement ListLayout component for Projects
  - [x] 6.1 Create ProjectListItem component
    - Create `components/layouts/ProjectListItem.tsx` with props: project, visibleColumns, onEdit, onDelete
    - Display project_name, category with folder icon, Status_Badge, Progress_Bar, task_count ("N tasks"), Assignee_List
    - Add checkbox for completion status (checked when status is "Completed" or "Closed")
    - Add Quick_Actions buttons (edit, delete) with 44x44px touch targets
    - Implement Progress_Bar with gradient fill (#7c3aed to #a78bfa)
    - Apply hover effect: background rgba(124, 58, 237, 0.08)
    - Make entire row clickable to open edit modal
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 9.3, 9.8, 12.2, 12.4, 12.6, 12.10_

  - [x] 6.2 Enhance ListLayout to support Projects
    - Update `components/layouts/ListLayout.tsx` to handle type="projects"
    - Render ProjectListItem components for projects
    - Implement virtualization for 50+ projects
    - Sort projects by project_id ascending by default
    - _Requirements: 3.1, 3.9, 11.1, 11.8_

  - [ ]* 6.3 Write unit tests for ProjectListItem
    - Test that all visible properties render correctly
    - Test that Progress_Bar displays correct percentage
    - Test that checkbox reflects completion status
    - Test that Quick_Actions trigger callbacks
    - Test that row click triggers onEdit

- [x] 7. Checkpoint - Verify layout rendering
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement ViewSettingsPanel component
  - [x] 8.1 Create ViewSettingsPanel modal shell
    - Create `components/ViewSettingsPanel.tsx` with props: type, preferences, onUpdate, onClose
    - Implement modal overlay with semi-transparent backdrop (rgba(0, 0, 0, 0.5))
    - Add modal header with title "View Settings" and close button (X icon)
    - Implement responsive layout: full-screen on mobile (<768px), centered modal on desktop
    - Add z-index to display on top of all content
    - Prevent background scrolling when open
    - Support Escape key to close
    - Support click outside to close
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 9.9, 13.4, 13.7_

  - [x] 8.2 Implement Layout section in settings panel
    - Add "Layout" section with radio buttons for Table and List
    - Display current layout mode as selected
    - Call onUpdate when layout changes
    - _Requirements: 1.1, 1.2, 4.3_

  - [x] 8.3 Implement Property Visibility section
    - Add "Property Visibility" section with two subsections: "Shown in view" and "Hidden"
    - Display checkboxes for each property (Tasks: name, status, priority, progress, due_date, assignees, notes, brief, url, project_id)
    - Display checkboxes for each property (Projects: name, category, status, progress, task_count, assignees, owner, notes, brief, url)
    - Prevent unchecking name property (always visible)
    - Call onUpdate when property visibility changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 14.6_

  - [x] 8.4 Implement Filter section with filter builder
    - Add "Filter" section displaying active filters as removable chips
    - Add "Add filter" button to open filter builder
    - Implement filter builder with dropdowns: field, operator, value
    - Support filter fields for Tasks: status, priority, assignees, due_date, project_id
    - Support filter fields for Projects: status, category, owner, assignees
    - Support operators: equals, not_equals, contains, in, is_empty, is_not_empty
    - Display filter chips with field, operator, value and remove button
    - Call onUpdate when filters change
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.11_

  - [x] 8.5 Implement Sort section with sort builder
    - Add "Sort" section displaying active sorts as removable chips
    - Add "Add sort" button to open sort builder
    - Implement sort builder with dropdowns: field, direction (ascending/descending)
    - Support sort fields for Tasks: name, status, priority, progress, due_date, project_id
    - Support sort fields for Projects: name, category, status, progress, task_count
    - Display sort chips with field, direction indicator (↑/↓) and remove button
    - Call onUpdate when sorts change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.10_

  - [x] 8.6 Implement Group section (Tasks only)
    - Add "Group" section with dropdown: None, Project
    - Display current grouping mode as selected
    - Call onUpdate when grouping changes
    - Only display this section when type="tasks"
    - _Requirements: 8.1, 8.2, 8.5, 8.8_

  - [x] 8.7 Implement auto-save for settings panel
    - Call onUpdate immediately when any setting changes (within 100ms)
    - Ensure onUpdate triggers ViewSystem to save to localStorage
    - _Requirements: 4.10, 10.3_

  - [ ]* 8.8 Write unit tests for ViewSettingsPanel
    - Test that modal opens and closes correctly
    - Test that Escape key closes modal
    - Test that click outside closes modal
    - Test that layout radio buttons update preferences
    - Test that property checkboxes update preferences
    - Test that filter add/remove updates preferences
    - Test that sort add/remove updates preferences
    - Test that group dropdown updates preferences (Tasks only)

  - [ ]* 8.9 Write property test for visible columns count
    - **Property 9: Visible Columns Count Matches Selection**
    - **Validates: Requirements 5.5**
    - Test that number of visible columns equals number of checked properties
    - Test that each visible column corresponds to exactly one checked property

- [x] 9. Integrate ViewSystem into Tasks and Projects pages
  - [x] 9.1 Integrate ViewSystem into Tasks page
    - Modify `app/tasks/page.tsx` to use ViewSystem component
    - Pass tasks data, currentUser, mobileFilter to ViewSystem
    - Pass onEdit and onDelete callbacks to ViewSystem
    - Preserve existing FAB, MobileHeader, BottomNav, Modal integration
    - Ensure MobileHeader filters combine with ViewSettings filters using AND logic
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.10_

  - [x] 9.2 Integrate ViewSystem into Projects page
    - Modify `app/projects/page.tsx` to use ViewSystem component
    - Pass projects data, currentUser, mobileFilter to ViewSystem
    - Pass onEdit and onDelete callbacks to ViewSystem
    - Preserve existing FAB, MobileHeader, BottomNav, Modal integration
    - Ensure MobileHeader filters combine with ViewSettings filters using AND logic
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.10_

  - [ ]* 9.3 Write integration tests for Tasks page
    - Test that ViewSystem renders with tasks data
    - Test that edit button opens Modal with correct task
    - Test that delete button triggers delete handler
    - Test that FAB creates new task
    - Test that MobileHeader filter combines with ViewSettings filters

  - [ ]* 9.4 Write integration tests for Projects page
    - Test that ViewSystem renders with projects data
    - Test that edit button opens Modal with correct project
    - Test that delete button triggers delete handler
    - Test that FAB creates new project
    - Test that MobileHeader filter combines with ViewSettings filters

- [x] 10. Implement styling and visual design
  - [x] 10.1 Create CSS modules for ViewSystem components
    - Create `components/ViewSystem.module.css` with toolbar styles
    - Create `components/layouts/ListLayout.module.css` with list item, group header, badge, progress bar styles
    - Create `components/ViewSettingsPanel.module.css` with modal, section, chip styles
    - Use Raymaizing purple palette: primary #7c3aed, secondary #a78bfa
    - Apply spacing: list item padding 12px 16px, group header padding 10px 16px
    - Apply colors: group header background rgba(124, 58, 237, 0.05), hover rgba(124, 58, 237, 0.08)
    - Apply typography: group header (font-weight 700, font-size 0.875rem), task name (font-weight 600, font-size 0.9375rem)
    - Apply transitions: 200-300ms for all interactive state changes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.11, 12.12_

  - [x] 10.2 Implement Status and Priority badges
    - Create reusable Badge component with color variants
    - Status colors: Done (#10b981), Active (#3b82f6), Blocked (#ef4444), Pending (#f59e0b)
    - Priority colors: Urgent (#ef4444), High (#f97316), Normal (#7c3aed), Low (#10b981), Recurring (#8b5cf6)
    - Apply consistent sizing and spacing
    - _Requirements: 12.8, 12.9_

  - [x] 10.3 Implement Progress Bar component
    - Create reusable ProgressBar component
    - Use gradient fill from #7c3aed to #a78bfa
    - Display percentage text inside or beside bar
    - Make responsive for mobile and desktop
    - _Requirements: 3.6, 12.10_

  - [x] 10.4 Implement Assignee List component
    - Create reusable AssigneeList component
    - Parse CSV assignees string into array
    - Display as chips or avatars (depending on space)
    - Truncate with "+N more" for long lists
    - _Requirements: 2.4, 3.2_

  - [ ]* 10.5 Write visual regression tests
    - Test that list items render correctly on mobile and desktop
    - Test that badges display correct colors
    - Test that progress bars display correct fill
    - Test that hover effects apply correctly

- [x] 11. Implement accessibility features
  - [x] 11.1 Add keyboard navigation support
    - Ensure Tab key navigates through all interactive elements in logical order
    - Ensure Enter/Space activates buttons and checkboxes
    - Ensure Escape closes ViewSettingsPanel
    - Add visible focus indicators for all interactive elements
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.10_

  - [x] 11.2 Add ARIA labels and live regions
    - Add ARIA labels for all icon-only buttons
    - Add ARIA live regions for dynamic content updates (filter/sort changes)
    - Add ARIA expanded/collapsed for group headers
    - Add ARIA checked for checkboxes
    - Announce view mode changes to screen readers
    - _Requirements: 13.5, 13.6, 13.9_

  - [x] 11.3 Implement focus management
    - Trap focus within ViewSettingsPanel when open
    - Return focus to trigger button when panel closes
    - Manage focus when modals open/close
    - _Requirements: 13.7_

  - [x] 11.4 Ensure color contrast compliance
    - Verify all text meets WCAG AA minimum 4.5:1 contrast ratio
    - Test with browser DevTools color contrast checker
    - Adjust colors if needed to meet standards
    - _Requirements: 13.8_

  - [ ]* 11.5 Write accessibility tests
    - Test keyboard navigation with Tab, Enter, Space, Escape
    - Test ARIA labels with jest-axe
    - Test focus management when opening/closing panels
    - Manual test with screen reader (document results)

- [x] 12. Implement performance optimizations
  - [x] 12.1 Add virtualization for large lists
    - Install and configure react-window library
    - Wrap TaskGroupList and ProjectListItem lists with FixedSizeList or VariableSizeList
    - Configure item size and overscan count
    - Test with 100+ items to verify 60fps scrolling
    - _Requirements: 11.1, 11.8_

  - [x] 12.2 Add memoization and optimization
    - Use React.memo for TaskListItem, ProjectListItem, Badge, ProgressBar components
    - Use useMemo for expensive computations (filtering, sorting, grouping)
    - Use useCallback for event handlers passed to child components
    - Avoid unnecessary re-renders when preferences change
    - _Requirements: 11.6, 11.7_

  - [x] 12.3 Implement lazy loading for ViewSettingsPanel
    - Use React.lazy and Suspense to lazy-load ViewSettingsPanel
    - Only load component when user first opens settings
    - Show loading spinner during lazy load
    - _Requirements: 11.9_

  - [x] 12.4 Add debouncing for filter inputs
    - Debounce filter value input changes by 150ms
    - Prevent excessive re-renders during typing
    - _Requirements: 11.5_

  - [x] 12.5 Optimize localStorage operations
    - Debounce localStorage save operations by 100ms
    - Use requestIdleCallback for non-critical saves (if available)
    - Avoid blocking main thread during save
    - _Requirements: 11.10_

  - [ ]* 12.6 Write performance tests
    - Test initial render time with 10, 50, 100, 500 items
    - Test filter/sort update time with 100 items
    - Test scroll performance (measure FPS) with 100+ items
    - Test localStorage save/load time
    - Verify all performance targets met: <500ms initial render (100 items), <300ms filter/sort, 60fps scroll

- [x] 13. Implement error handling and edge cases
  - [x] 13.1 Add localStorage error handling
    - Detect unavailable localStorage with try-catch
    - Display warning toast: "Settings cannot be saved (localStorage unavailable)"
    - Fall back to in-memory state only
    - Detect quota exceeded errors and clear old settings
    - Display info toast: "Storage limit reached, cleared old settings"
    - Handle corrupted data by falling back to defaults
    - Log all errors to console with details
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 13.2 Add data processing error handling
    - Skip invalid filter conditions and log warning
    - Display warning in settings panel: "Invalid filter ignored"
    - Skip invalid sort fields and log warning
    - Display warning in settings panel: "Invalid sort field ignored"
    - Handle null/undefined filter values safely
    - Create "Unassigned" group for tasks without project_id
    - _Requirements: 14.7, 14.8, 14.9_

  - [x] 13.3 Add empty state handling
    - Display empty state message: "No items match your filters" when result is empty
    - Provide "Clear filters" button in empty state
    - Hide empty Task_Groups after filtering
    - _Requirements: 14.4, 14.5_

  - [x] 13.4 Add integration error handling
    - Catch errors from onEdit callback and display error toast: "Failed to open editor. Please try again."
    - Catch errors from onDelete callback and display error toast: "Failed to delete item. Please try again."
    - Handle data refresh failures with loading state and retry button
    - Log all errors with task/project IDs for debugging
    - _Requirements: 14.10_

  - [ ]* 13.5 Write unit tests for error scenarios
    - Test localStorage unavailable fallback
    - Test quota exceeded recovery
    - Test corrupted data fallback
    - Test invalid filter handling
    - Test invalid sort handling
    - Test empty result set display
    - Test modal open/delete error handling

- [x] 14. Final integration and testing
  - [x] 14.1 Test mobile responsiveness on real devices
    - Test on iPhone SE (320px width)
    - Test on iPhone 12 (390px width)
    - Test on iPad (768px width)
    - Verify touch targets are 44x44px minimum
    - Verify no horizontal scrolling
    - Verify smooth animations (300ms max)
    - Verify 60fps scrolling performance
    - Test swipe gestures for closing settings panel
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 14.2 Test integration with existing features
    - Verify MobileHeader filters combine with ViewSettings filters (AND logic)
    - Verify Modal opens correctly from list view edit buttons
    - Verify delete confirmation works from list view
    - Verify FAB creates new items that appear in view (if match filters)
    - Verify view settings persist across page navigation (Tasks → Projects → Tasks)
    - Verify Toast notifications work correctly
    - Verify authentication and user context respected
    - Verify BottomNav and Sidebar navigation preserved
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_

  - [x] 14.3 Test edge cases and data scenarios
    - Test with 0 items (empty state)
    - Test with 1 item
    - Test with 500+ items (performance)
    - Test with all items filtered out
    - Test with tasks without project_id (Unassigned group)
    - Test with very long task/project names (truncation)
    - Test with special characters in filter values
    - Test with null/undefined values in data fields
    - _Requirements: 14.4, 14.5, 14.8, 14.9_

  - [ ]* 14.4 Write end-to-end integration tests
    - Test complete workflow: open settings → add filter → add sort → switch layout → close settings → verify persistence
    - Test complete workflow: create task → verify appears in view → edit task → verify updates in view → delete task → verify removed from view
    - Test complete workflow: switch to mobile view → open settings → change preferences → verify responsive layout

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Integration tests verify compatibility with existing features
- Performance tests ensure targets are met: <500ms initial render (100 items), <300ms filter/sort, 60fps scroll
- Accessibility tests ensure WCAG AA compliance and keyboard/screen reader support
- The implementation uses TypeScript and React with hooks (useState, useEffect, useMemo, useCallback)
- The system uses localStorage for persistence with separate keys for Tasks and Projects
- The design follows a 5-layer architecture: Page Layer, View Controller, Layout Renderer, Settings Panel, Persistence Manager
- Virtualization (react-window) is used for lists with 50+ items
- All components are responsive and mobile-first (minimum 320px width)
- The styling uses the Raymaizing purple palette (#7c3aed primary, #a78bfa secondary)
