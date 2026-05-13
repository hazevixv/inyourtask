# Requirements Document: Notion-Style Views for Tasks and Projects

## Introduction

This document specifies the requirements for implementing a comprehensive Notion-style view system for both Tasks and Projects pages. The system will provide multiple layout modes (Table, List), advanced view settings panel, property visibility controls, filtering, sorting, and grouping capabilities. The implementation must maintain perfect mobile responsiveness as the application is deployed as a Progressive Web App (PWA).

## Glossary

- **View_System**: The complete view management system including layout modes, settings panel, and data presentation
- **Layout_Mode**: The visual presentation format for data (Table or List)
- **View_Settings_Panel**: A modal interface for configuring view preferences
- **Property_Visibility**: User-controlled display of data columns/fields
- **Filter_Condition**: A rule that determines which items are displayed
- **Sort_Rule**: A rule that determines the order of displayed items
- **Group_Rule**: A rule that organizes items into collapsible sections
- **List_View**: A compact, mobile-friendly layout mode showing essential information
- **Table_View**: The current grid-based layout showing all columns
- **View_Preferences**: User settings stored in localStorage for persistence
- **Task_Group**: A collapsible section containing tasks belonging to a specific project
- **Quick_Actions**: Inline buttons for common operations (edit, delete)
- **Progress_Bar**: A visual representation of completion percentage
- **Status_Badge**: A colored label indicating current status
- **Priority_Badge**: A colored label indicating priority level
- **Assignee_List**: A display of users assigned to a task or project
- **Property_Column**: A data field that can be shown or hidden in views
- **Filter_Preset**: A saved collection of filter conditions
- **Multi_Level_Sort**: Multiple sort rules applied in sequence
- **Column_Reordering**: Drag-and-drop functionality to change column positions
- **Virtualization**: Performance optimization technique for rendering large lists

## Requirements

### Requirement 1: View Mode Management

**User Story:** As a user, I want to switch between Table and List layout modes, so that I can choose the most appropriate view for my current context and device.

#### Acceptance Criteria

1. THE View_System SHALL provide exactly two Layout_Modes: Table and List
2. WHEN a user clicks the layout toggle button, THE View_System SHALL switch to the selected Layout_Mode within 300ms
3. THE View_System SHALL persist the selected Layout_Mode to localStorage
4. WHEN a user returns to the page, THE View_System SHALL restore the previously selected Layout_Mode from localStorage
5. THE View_System SHALL display a visual indicator showing which Layout_Mode is currently active
6. THE layout toggle button SHALL be accessible on both desktop and mobile devices
7. WHEN switching Layout_Modes, THE View_System SHALL preserve all active filters, sorts, and grouping settings

### Requirement 2: Tasks List View Display

**User Story:** As a user, I want to view tasks in a compact list format grouped by project, so that I can quickly scan my work organized by project context.

#### Acceptance Criteria

1. WHEN List layout mode is active on the Tasks page, THE View_System SHALL display tasks grouped by project_id
2. THE View_System SHALL render each Task_Group with a collapsible header showing project_id, project_name, and task count
3. WHEN a user clicks a Task_Group header, THE View_System SHALL toggle the collapsed/expanded state within 200ms
4. FOR EACH task in a Task_Group, THE View_System SHALL display: task_name, Status_Badge, Priority_Badge, progress percentage, due_date, and Assignee_List
5. THE View_System SHALL display a checkbox for each task indicating completion status (checked when status is "Done")
6. WHEN a user clicks a task row, THE View_System SHALL open the edit modal for that task
7. THE View_System SHALL display Quick_Actions (edit, delete buttons) for each task
8. THE View_System SHALL persist Task_Group collapsed/expanded states to localStorage
9. WHEN no tasks exist for a project, THE View_System SHALL NOT display an empty Task_Group
10. THE View_System SHALL sort Task_Groups by project_id in ascending order by default

### Requirement 3: Projects List View Display

**User Story:** As a user, I want to view projects in a compact list format, so that I can quickly scan project status and progress.

#### Acceptance Criteria

1. WHEN List layout mode is active on the Projects page, THE View_System SHALL display projects in a compact list format
2. FOR EACH project, THE View_System SHALL display: project_name, category, Status_Badge, Progress_Bar, task_count, and Assignee_List
3. THE View_System SHALL display a checkbox for each project indicating completion status (checked when status is "Completed" or "Closed")
4. WHEN a user clicks a project row, THE View_System SHALL open the edit modal for that project
5. THE View_System SHALL display Quick_Actions (edit, delete buttons) for each project
6. THE View_System SHALL render the Progress_Bar with a visual fill proportional to the progress percentage
7. THE View_System SHALL display the task_count with the format "N tasks"
8. THE View_System SHALL display category with an icon prefix (folder icon)
9. THE View_System SHALL sort projects by project_id in ascending order by default

### Requirement 4: View Settings Panel Interface

**User Story:** As a user, I want to access a settings panel to customize my view, so that I can configure visibility, filtering, sorting, and grouping options.

#### Acceptance Criteria

1. THE View_System SHALL provide a "View Settings" button accessible from both Tasks and Projects pages
2. WHEN a user clicks the "View Settings" button, THE View_Settings_Panel SHALL open within 200ms
3. THE View_Settings_Panel SHALL display sections for: Layout, Property Visibility, Filter, Sort, and Group
4. THE View_Settings_Panel SHALL include a close button (X icon) in the header
5. WHEN a user clicks the close button or clicks outside the panel, THE View_Settings_Panel SHALL close within 200ms
6. THE View_Settings_Panel SHALL be responsive and usable on mobile devices (minimum width 320px)
7. THE View_Settings_Panel SHALL display on top of all other content with appropriate z-index
8. THE View_Settings_Panel SHALL include a semi-transparent backdrop overlay
9. WHEN the View_Settings_Panel is open, THE View_System SHALL prevent scrolling of background content
10. THE View_Settings_Panel SHALL auto-save all changes to localStorage immediately upon modification

### Requirement 5: Property Visibility Controls

**User Story:** As a user, I want to show or hide specific columns/properties, so that I can focus on the information most relevant to my current task.

#### Acceptance Criteria

1. THE View_Settings_Panel SHALL display a "Property Visibility" section with checkboxes for each available Property_Column
2. THE View_System SHALL provide separate property lists for Tasks page and Projects page
3. FOR Tasks page, THE View_System SHALL support visibility control for: name, status, priority, progress, due_date, assignees, notes, brief, url, project_id
4. FOR Projects page, THE View_System SHALL support visibility control for: name, category, status, progress, task_count, assignees, owner, notes, brief, url
5. WHEN a user toggles a property checkbox, THE View_System SHALL immediately update the display to show or hide that Property_Column
6. THE View_System SHALL organize properties into "Shown in view" and "Hidden" sections
7. THE View_System SHALL require that at least one property remains visible (name property cannot be hidden)
8. THE View_System SHALL persist Property_Visibility settings to localStorage separately for Tasks and Projects pages
9. WHEN in Table layout mode, THE View_System SHALL hide table columns for properties marked as hidden
10. WHEN in List layout mode, THE View_System SHALL omit hidden properties from the compact display

### Requirement 6: Basic Filtering Interface

**User Story:** As a user, I want to filter tasks and projects by various criteria, so that I can focus on specific subsets of data.

#### Acceptance Criteria

1. THE View_Settings_Panel SHALL display a "Filter" section showing active Filter_Conditions
2. THE View_System SHALL provide an "Add filter" button to create new Filter_Conditions
3. WHEN a user clicks "Add filter", THE View_System SHALL display a filter builder interface
4. FOR Tasks page, THE View_System SHALL support filtering by: status, priority, assignees, due_date, project_id
5. FOR Projects page, THE View_System SHALL support filtering by: status, category, owner, assignees
6. EACH Filter_Condition SHALL specify: field, operator, and value
7. THE View_System SHALL support operators: equals, not equals, contains, in (multiple values), is empty, is not empty
8. WHEN a user applies a Filter_Condition, THE View_System SHALL immediately update the display to show only matching items
9. THE View_System SHALL display active Filter_Conditions as removable chips/tags
10. WHEN a user removes a Filter_Condition, THE View_System SHALL immediately update the display
11. THE View_System SHALL persist active Filter_Conditions to localStorage
12. THE View_System SHALL apply multiple Filter_Conditions using AND logic (all conditions must match)

### Requirement 7: Basic Sorting Interface

**User Story:** As a user, I want to sort tasks and projects by various fields, so that I can view data in my preferred order.

#### Acceptance Criteria

1. THE View_Settings_Panel SHALL display a "Sort" section showing active Sort_Rules
2. THE View_System SHALL provide an "Add sort" button to create new Sort_Rules
3. WHEN a user clicks "Add sort", THE View_System SHALL display a sort builder interface
4. FOR Tasks page, THE View_System SHALL support sorting by: name, status, priority, progress, due_date, project_id
5. FOR Projects page, THE View_System SHALL support sorting by: name, category, status, progress, task_count
6. EACH Sort_Rule SHALL specify: field and direction (ascending or descending)
7. WHEN a user applies a Sort_Rule, THE View_System SHALL immediately update the display order
8. THE View_System SHALL display active Sort_Rules as removable chips/tags with direction indicators
9. WHEN a user removes a Sort_Rule, THE View_System SHALL immediately update the display
10. THE View_System SHALL persist active Sort_Rules to localStorage
11. THE View_System SHALL support Multi_Level_Sort by applying Sort_Rules in the order they were added
12. WHEN multiple Sort_Rules exist, THE View_System SHALL apply them sequentially (first by first rule, then by second rule for ties, etc.)

### Requirement 8: Grouping for Tasks

**User Story:** As a user, I want to group tasks by project in List view, so that I can see tasks organized by their project context.

#### Acceptance Criteria

1. THE View_Settings_Panel SHALL display a "Group" section on the Tasks page
2. THE View_System SHALL provide a "Group by" dropdown with options: None, Project
3. WHEN "Group by: Project" is selected, THE View_System SHALL organize tasks into Task_Groups by project_id
4. WHEN "Group by: None" is selected, THE View_System SHALL display tasks in a flat list without grouping
5. THE View_System SHALL persist the Group_Rule to localStorage
6. WHEN grouping is active, THE View_System SHALL apply Sort_Rules within each group (not across groups)
7. WHEN grouping is active, THE View_System SHALL sort groups by project_id in ascending order
8. THE View_System SHALL display the group setting only on the Tasks page (not available for Projects page)

### Requirement 9: Mobile Responsiveness

**User Story:** As a mobile user, I want all view features to work perfectly on my device, so that I can manage tasks and projects on the go.

#### Acceptance Criteria

1. THE View_System SHALL render correctly on devices with minimum width of 320px
2. THE View_Settings_Panel SHALL be fully functional on touch devices
3. THE View_System SHALL use touch-friendly tap targets (minimum 44x44px) for all interactive elements
4. WHEN in List layout mode on mobile, THE View_System SHALL optimize spacing for compact display
5. THE View_System SHALL prevent horizontal scrolling on mobile devices
6. THE View_System SHALL use smooth animations (max 300ms) for all transitions
7. THE View_System SHALL maintain performance with 60fps scrolling on mobile devices
8. THE Quick_Actions buttons SHALL be easily tappable on mobile devices
9. THE View_Settings_Panel SHALL use a full-screen or bottom-sheet layout on mobile devices (viewport width < 768px)
10. THE View_System SHALL support swipe gestures for closing the View_Settings_Panel on mobile

### Requirement 10: View Preferences Persistence

**User Story:** As a user, I want my view preferences to be saved automatically, so that my settings are preserved across sessions.

#### Acceptance Criteria

1. THE View_System SHALL store View_Preferences in browser localStorage
2. THE View_System SHALL use separate localStorage keys for Tasks page ("tasks-view-settings") and Projects page ("projects-view-settings")
3. THE View_System SHALL save View_Preferences immediately when any setting changes (within 100ms)
4. WHEN a user loads the Tasks or Projects page, THE View_System SHALL restore View_Preferences from localStorage within 200ms
5. THE View_Preferences SHALL include: layout mode, visible columns, active filters, active sorts, group setting, and collapsed group states
6. IF localStorage is unavailable or corrupted, THE View_System SHALL use default settings without error
7. THE View_System SHALL handle localStorage quota exceeded errors gracefully by removing oldest preferences
8. THE View_System SHALL validate loaded View_Preferences and ignore invalid settings
9. THE View_System SHALL provide default View_Preferences when no saved settings exist
10. THE default View_Preferences SHALL be: Table layout, all columns visible, no filters, no sorts, group by Project (for Tasks)

### Requirement 11: Performance Optimization

**User Story:** As a user working with large datasets, I want the view system to remain fast and responsive, so that I can work efficiently without lag.

#### Acceptance Criteria

1. WHEN displaying more than 50 items in List view, THE View_System SHALL use Virtualization to render only visible items
2. THE View_System SHALL render initial view within 500ms for datasets up to 100 items
3. THE View_System SHALL render initial view within 1000ms for datasets up to 500 items
4. WHEN applying filters or sorts, THE View_System SHALL update the display within 300ms for datasets up to 100 items
5. THE View_System SHALL debounce filter input changes by 150ms to prevent excessive re-renders
6. THE View_System SHALL use React.memo or useMemo for expensive computations
7. THE View_System SHALL avoid unnecessary re-renders when View_Preferences change
8. THE View_System SHALL maintain 60fps scrolling performance in List view with 100+ items
9. THE View_System SHALL lazy-load the View_Settings_Panel component (not loaded until opened)
10. THE View_System SHALL optimize localStorage operations to avoid blocking the main thread

### Requirement 12: Styling and Visual Design

**User Story:** As a user, I want the view system to match the existing application design, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE View_System SHALL use the Raymaizing purple palette: primary color #7c3aed, secondary color #a78bfa
2. THE View_System SHALL use consistent spacing: list item padding 12px 16px, group header padding 10px 16px
3. THE View_System SHALL use group header background color rgba(124, 58, 237, 0.05)
4. THE View_System SHALL use list item hover background color rgba(124, 58, 237, 0.08)
5. THE View_System SHALL use border color rgba(226, 232, 240, 0.8)
6. THE View_System SHALL use typography: group header (font-weight 700, font-size 0.875rem), task name (font-weight 600, font-size 0.9375rem)
7. THE View_System SHALL use smooth transitions (200-300ms) for all interactive state changes
8. THE Status_Badge SHALL use colors matching existing badge styles (Done: #10b981, Active: #3b82f6, etc.)
9. THE Priority_Badge SHALL use colors matching existing priority styles (Urgent: #ef4444, High: #f97316, Normal: #7c3aed, Low: #10b981)
10. THE Progress_Bar SHALL use a gradient fill from #7c3aed to #a78bfa
11. THE View_Settings_Panel SHALL use a semi-transparent backdrop (rgba(0, 0, 0, 0.5))
12. THE View_System SHALL maintain consistent icon sizing (16px for most icons, 14px for inline metadata icons)

### Requirement 13: Accessibility

**User Story:** As a user relying on assistive technologies, I want the view system to be fully accessible, so that I can use all features effectively.

#### Acceptance Criteria

1. THE View_System SHALL provide keyboard navigation for all interactive elements
2. THE View_System SHALL support Tab key navigation through all controls in logical order
3. THE View_System SHALL support Enter/Space key activation for buttons and checkboxes
4. THE View_System SHALL support Escape key to close the View_Settings_Panel
5. THE View_System SHALL provide ARIA labels for all icon-only buttons
6. THE View_System SHALL provide ARIA live regions for dynamic content updates (filter/sort changes)
7. THE View_System SHALL maintain focus management when opening/closing the View_Settings_Panel
8. THE View_System SHALL provide sufficient color contrast (WCAG AA minimum 4.5:1 for text)
9. THE View_System SHALL support screen reader announcements for view mode changes
10. THE View_System SHALL provide visible focus indicators for all interactive elements

### Requirement 14: Error Handling and Edge Cases

**User Story:** As a user, I want the view system to handle errors gracefully, so that I don't lose my work or encounter confusing states.

#### Acceptance Criteria

1. WHEN localStorage is unavailable, THE View_System SHALL use in-memory state and display a warning message
2. WHEN localStorage quota is exceeded, THE View_System SHALL clear old preferences and retry saving
3. WHEN invalid View_Preferences are loaded, THE View_System SHALL use default settings and log the error
4. WHEN no items match active filters, THE View_System SHALL display an empty state message: "No items match your filters"
5. WHEN a filtered project has no visible tasks, THE View_System SHALL hide that Task_Group
6. WHEN all properties are attempted to be hidden, THE View_System SHALL prevent hiding the name property and display a warning
7. WHEN a Sort_Rule references a hidden property, THE View_System SHALL still apply the sort correctly
8. WHEN a Filter_Condition references a property with null/undefined values, THE View_System SHALL handle the comparison safely
9. WHEN switching between pages, THE View_System SHALL load the correct View_Preferences without mixing Tasks and Projects settings
10. WHEN the View_Settings_Panel is open and data is updated (new task/project added), THE View_System SHALL update the display without closing the panel

### Requirement 15: Integration with Existing Features

**User Story:** As a user, I want the new view system to work seamlessly with existing features, so that my workflow is not disrupted.

#### Acceptance Criteria

1. THE View_System SHALL preserve existing filter functionality from MobileHeader (All/My Tasks, All/My Projects)
2. THE View_System SHALL apply both MobileHeader filters AND View_Settings_Panel filters using AND logic
3. WHEN a user clicks "Edit" on a task or project, THE View_System SHALL open the existing Modal component
4. WHEN a user clicks "Delete" on a task or project, THE View_System SHALL trigger the existing delete handler
5. THE View_System SHALL work correctly with the existing FAB (Floating Action Button) for creating new items
6. THE View_System SHALL maintain compatibility with the existing data loading and refresh mechanisms
7. THE View_System SHALL respect the existing authentication and user context
8. THE View_System SHALL work correctly with the existing Toast notification system
9. THE View_System SHALL maintain the existing responsive breakpoints (desktop/mobile)
10. THE View_System SHALL preserve the existing BottomNav and Sidebar navigation functionality

## Parser and Serializer Requirements

### Requirement 16: View Settings Serialization

**User Story:** As a developer, I want to reliably serialize and deserialize view settings, so that user preferences are correctly saved and restored.

#### Acceptance Criteria

1. THE View_Settings_Serializer SHALL convert View_Preferences objects to JSON strings
2. THE View_Settings_Parser SHALL parse JSON strings into View_Preferences objects
3. WHEN invalid JSON is provided, THE View_Settings_Parser SHALL return null and log an error
4. THE View_Settings_Pretty_Printer SHALL format View_Preferences objects into valid JSON strings with 2-space indentation
5. FOR ALL valid View_Preferences objects, parsing then printing then parsing SHALL produce an equivalent object (round-trip property)
6. THE View_Settings_Parser SHALL validate that required fields exist: layout, visibleColumns, filters, sorts
7. THE View_Settings_Parser SHALL provide default values for missing optional fields: groupBy, collapsedGroups
8. THE View_Settings_Serializer SHALL handle special characters in filter values (quotes, newlines, unicode)
9. THE View_Settings_Parser SHALL reject objects with invalid layout values (not "table" or "list")
10. THE View_Settings_Parser SHALL validate that visibleColumns is an array of strings

## Testing Guidance

### Property-Based Testing Recommendations

**Filter Application (Requirement 6):**
- Property: For any set of Filter_Conditions, applying filters then counting results should equal manually counting items matching all conditions
- Property: Applying the same filter twice should produce identical results (idempotence)
- Property: The set of filtered items should always be a subset of or equal to the original set (len(filtered) <= len(original))

**Sort Application (Requirement 7):**
- Property: For any Sort_Rule, the resulting list should satisfy the sort order (each item <= next item for ascending)
- Property: Sorting twice by the same rule should produce identical results (idempotence)
- Property: Sorting should preserve all items (no items added or removed)
- Property: Multi-level sort should be stable (items equal on first sort key maintain their relative order from second sort key)

**View Settings Serialization (Requirement 16):**
- Property: parse(serialize(settings)) should equal settings (round-trip)
- Property: serialize(parse(json)) should equal json for valid json (round-trip)
- Property: Serializing then parsing should preserve all field values and types

**Property Visibility (Requirement 5):**
- Property: The number of visible columns should equal the number of checked properties
- Property: Toggling a property twice should return to the original state (idempotence)
- Property: At least one property should always be visible (invariant)

**Grouping (Requirement 8):**
- Property: The union of all groups should equal the original task set
- Property: Groups should be disjoint (no task appears in multiple groups)
- Property: Each group should contain only tasks with matching project_id (invariant)

### Integration Testing Recommendations

**Mobile Responsiveness (Requirement 9):**
- Test on real devices: iPhone SE (320px), iPhone 12 (390px), iPad (768px)
- Test touch interactions: tap, swipe, scroll
- Test orientation changes: portrait to landscape
- Use 2-3 representative device sizes, not property-based testing

**Performance (Requirement 11):**
- Test with representative datasets: 10, 50, 100, 500 items
- Measure render time, scroll performance, filter/sort time
- Use 3-5 dataset sizes, not property-based testing

**Integration with Existing Features (Requirement 15):**
- Test that Modal opens correctly from List view
- Test that delete confirmation works from List view
- Test that filters combine correctly with MobileHeader filters
- Use 2-3 example scenarios, not property-based testing

---

**Document Status:** ✅ Complete - Ready for Review  
**Total Requirements:** 16  
**Total Acceptance Criteria:** 160+  
**Estimated Implementation Time:** 20-24 hours
