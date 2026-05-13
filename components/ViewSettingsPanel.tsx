'use client';

import { useEffect, useState } from 'react';
import { X, Table, List, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { ViewPreferences, FilterCondition, SortRule } from '@/lib/viewPersistence';
import styles from './ViewSettingsPanel.module.css';

interface ViewSettingsPanelProps {
  type: 'tasks' | 'projects';
  preferences: ViewPreferences;
  onUpdate: (prefs: ViewPreferences) => void;
  onClose: () => void;
}

/**
 * ViewSettingsPanel Component
 * 
 * Modal interface for customizing view preferences including layout, property visibility,
 * filters, sorts, and grouping options.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12
 * 
 * Features:
 * - Modal overlay with semi-transparent backdrop (rgba(0, 0, 0, 0.5))
 * - Responsive layout: full-screen on mobile (<768px), centered modal on desktop
 * - Escape key to close
 * - Click outside to close
 * - Prevents background scrolling when open
 * - High z-index to display on top of all content
 */
export default function ViewSettingsPanel({
  type,
  preferences,
  onUpdate,
  onClose,
}: ViewSettingsPanelProps) {
  // State for filter/sort builders
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [showSortBuilder, setShowSortBuilder] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition>>({});
  const [newSort, setNewSort] = useState<Partial<SortRule>>({});

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    layout: true,
    properties: true,
    filters: true,
    sorts: true,
    group: true,
  });

  // Property lists based on type
  const TASKS_PROPERTIES = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'progress', label: 'Progress' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'assignees', label: 'Assignees' },
    { key: 'notes', label: 'Notes' },
    { key: 'brief', label: 'Brief' },
    { key: 'url', label: 'URL' },
    { key: 'project_id', label: 'Project' },
  ];

  const PROJECTS_PROPERTIES = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress' },
    { key: 'task_count', label: 'Task Count' },
    { key: 'assignees', label: 'Assignees' },
    { key: 'owner', label: 'Owner' },
    { key: 'notes', label: 'Notes' },
    { key: 'brief', label: 'Brief' },
    { key: 'url', label: 'URL' },
  ];

  const properties = type === 'tasks' ? TASKS_PROPERTIES : PROJECTS_PROPERTIES;

  // Filter fields based on type
  const TASKS_FILTER_FIELDS = ['status', 'priority', 'assignees', 'due_date', 'project_id'];
  const PROJECTS_FILTER_FIELDS = ['status', 'category', 'owner', 'assignees'];
  const filterFields = type === 'tasks' ? TASKS_FILTER_FIELDS : PROJECTS_FILTER_FIELDS;

  // Sort fields based on type
  const TASKS_SORT_FIELDS = ['name', 'status', 'priority', 'progress', 'due_date', 'project_id'];
  const PROJECTS_SORT_FIELDS = ['name', 'category', 'status', 'progress', 'task_count'];
  const sortFields = type === 'tasks' ? TASKS_SORT_FIELDS : PROJECTS_SORT_FIELDS;

  // Filter operators
  const FILTER_OPERATORS = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ];

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Auto-save helper - calls onUpdate within 100ms
  const updatePreferences = (updates: Partial<ViewPreferences>) => {
    setTimeout(() => {
      onUpdate({ ...preferences, ...updates });
    }, 50);
  };

  // Layout handlers
  const handleLayoutChange = (layout: 'table' | 'list') => {
    updatePreferences({ layout });
  };

  // Property visibility handlers
  const handlePropertyToggle = (propertyKey: string) => {
    // Prevent hiding name property
    if (propertyKey === 'name' && preferences.visibleColumns.includes('name')) {
      return;
    }

    const newVisibleColumns = preferences.visibleColumns.includes(propertyKey)
      ? preferences.visibleColumns.filter(col => col !== propertyKey)
      : [...preferences.visibleColumns, propertyKey];

    updatePreferences({ visibleColumns: newVisibleColumns });
  };

  // Filter handlers
  const handleAddFilter = () => {
    if (!newFilter.field || !newFilter.operator) return;

    const needsValue = !['is_empty', 'is_not_empty'].includes(newFilter.operator);
    if (needsValue && !newFilter.value) return;

    const filter: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: newFilter.field,
      operator: newFilter.operator as FilterCondition['operator'],
      value: newFilter.value,
    };

    updatePreferences({ filters: [...preferences.filters, filter] });
    setNewFilter({});
    setShowFilterBuilder(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    updatePreferences({
      filters: preferences.filters.filter(f => f.id !== filterId),
    });
  };

  // Sort handlers
  const handleAddSort = () => {
    if (!newSort.field || !newSort.direction) return;

    const sort: SortRule = {
      id: `sort-${Date.now()}`,
      field: newSort.field,
      direction: newSort.direction as 'asc' | 'desc',
    };

    updatePreferences({ sorts: [...preferences.sorts, sort] });
    setNewSort({});
    setShowSortBuilder(false);
  };

  const handleRemoveSort = (sortId: string) => {
    updatePreferences({
      sorts: preferences.sorts.filter(s => s.id !== sortId),
    });
  };

  // Group handlers (Tasks only)
  const handleGroupChange = (groupBy: 'project' | null) => {
    updatePreferences({ groupBy });
  };

  // Section toggle
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div 
      className={styles.overlay} 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-settings-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <h2 id="view-settings-title" className={styles.title}>
              View Settings
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close settings panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* 8.2 - Layout Section */}
          <section className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('layout')}
              aria-expanded={expandedSections.layout}
            >
              <h3 className={styles.sectionTitle}>Layout</h3>
              {expandedSections.layout ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSections.layout && (
              <div className={styles.sectionContent}>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="layout"
                      value="table"
                      checked={preferences.layout === 'table'}
                      onChange={() => handleLayoutChange('table')}
                      className={styles.radioInput}
                    />
                    <Table size={18} />
                    <span>Table</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="layout"
                      value="list"
                      checked={preferences.layout === 'list'}
                      onChange={() => handleLayoutChange('list')}
                      className={styles.radioInput}
                    />
                    <List size={18} />
                    <span>List</span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* 8.3 - Property Visibility Section */}
          <section className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('properties')}
              aria-expanded={expandedSections.properties}
            >
              <h3 className={styles.sectionTitle}>Property Visibility</h3>
              {expandedSections.properties ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSections.properties && (
              <div className={styles.sectionContent}>
                <div className={styles.propertyList}>
                  {properties.map(prop => (
                    <label key={prop.key} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={preferences.visibleColumns.includes(prop.key)}
                        onChange={() => handlePropertyToggle(prop.key)}
                        disabled={prop.key === 'name' && preferences.visibleColumns.includes('name')}
                        className={styles.checkbox}
                      />
                      <span>{prop.label}</span>
                      {prop.key === 'name' && <span className={styles.required}>(required)</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 8.4 - Filter Section */}
          <section className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('filters')}
              aria-expanded={expandedSections.filters}
            >
              <h3 className={styles.sectionTitle}>Filters</h3>
              {expandedSections.filters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSections.filters && (
              <div className={styles.sectionContent}>
                {/* Active filters */}
                {preferences.filters.length > 0 && (
                  <div className={styles.chipList}>
                    {preferences.filters.map(filter => (
                      <div key={filter.id} className={styles.chip}>
                        <span className={styles.chipText}>
                          {filter.field} {filter.operator} {filter.value || ''}
                        </span>
                        <button
                          className={styles.chipRemove}
                          onClick={() => handleRemoveFilter(filter.id)}
                          aria-label={`Remove filter: ${filter.field}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filter builder */}
                {showFilterBuilder ? (
                  <div className={styles.builder}>
                    <select
                      value={newFilter.field || ''}
                      onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
                      className={styles.select}
                    >
                      <option value="">Select field</option>
                      {filterFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                    <select
                      value={newFilter.operator || ''}
                      onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as FilterCondition['operator'] })}
                      className={styles.select}
                    >
                      <option value="">Select operator</option>
                      {FILTER_OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {newFilter.operator && !['is_empty', 'is_not_empty'].includes(newFilter.operator) && (
                      <input
                        type="text"
                        value={newFilter.value || ''}
                        onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                        placeholder="Value"
                        className={styles.input}
                      />
                    )}
                    <div className={styles.builderActions}>
                      <button onClick={handleAddFilter} className={styles.btnPrimary}>
                        Add
                      </button>
                      <button onClick={() => setShowFilterBuilder(false)} className={styles.btnSecondary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowFilterBuilder(true)}
                    className={styles.btnAdd}
                  >
                    <Plus size={16} />
                    Add filter
                  </button>
                )}
              </div>
            )}
          </section>

          {/* 8.5 - Sort Section */}
          <section className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('sorts')}
              aria-expanded={expandedSections.sorts}
            >
              <h3 className={styles.sectionTitle}>Sort</h3>
              {expandedSections.sorts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSections.sorts && (
              <div className={styles.sectionContent}>
                {/* Active sorts */}
                {preferences.sorts.length > 0 && (
                  <div className={styles.chipList}>
                    {preferences.sorts.map(sort => (
                      <div key={sort.id} className={styles.chip}>
                        <span className={styles.chipText}>
                          {sort.field} {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                        <button
                          className={styles.chipRemove}
                          onClick={() => handleRemoveSort(sort.id)}
                          aria-label={`Remove sort: ${sort.field}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sort builder */}
                {showSortBuilder ? (
                  <div className={styles.builder}>
                    <select
                      value={newSort.field || ''}
                      onChange={(e) => setNewSort({ ...newSort, field: e.target.value })}
                      className={styles.select}
                    >
                      <option value="">Select field</option>
                      {sortFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                    <select
                      value={newSort.direction || ''}
                      onChange={(e) => setNewSort({ ...newSort, direction: e.target.value as 'asc' | 'desc' })}
                      className={styles.select}
                    >
                      <option value="">Select direction</option>
                      <option value="asc">Ascending ↑</option>
                      <option value="desc">Descending ↓</option>
                    </select>
                    <div className={styles.builderActions}>
                      <button onClick={handleAddSort} className={styles.btnPrimary}>
                        Add
                      </button>
                      <button onClick={() => setShowSortBuilder(false)} className={styles.btnSecondary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSortBuilder(true)}
                    className={styles.btnAdd}
                  >
                    <Plus size={16} />
                    Add sort
                  </button>
                )}
              </div>
            )}
          </section>

          {/* 8.6 - Group Section (Tasks only) */}
          {type === 'tasks' && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection('group')}
                aria-expanded={expandedSections.group}
              >
                <h3 className={styles.sectionTitle}>Group</h3>
                {expandedSections.group ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSections.group && (
                <div className={styles.sectionContent}>
                  <select
                    value={preferences.groupBy || 'null'}
                    onChange={(e) => handleGroupChange(e.target.value === 'null' ? null : 'project')}
                    className={styles.select}
                  >
                    <option value="null">None</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
