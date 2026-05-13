'use client';

/**
 * TableLayout Component
 * 
 * Wrapper component that renders data in table format with dynamic column visibility.
 * Wraps the existing table rendering logic from Tasks.tsx and Projects.tsx.
 * 
 * Requirements: 5.5, 5.7, 5.9, 5.10, 14.6
 */

import { useMemo } from 'react';
import DataTable from '../DataTable';

// ============================================================================
// Type Definitions
// ============================================================================

interface TableLayoutProps {
  type: 'tasks' | 'projects';
  data: any[];
  visibleColumns: string[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// ============================================================================
// Column Configuration
// ============================================================================

/**
 * Define available columns for Tasks
 * Requirements: 5.3
 */
const TASK_COLUMNS = [
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
] as const;

/**
 * Define available columns for Projects
 * Requirements: 5.4
 */
const PROJECT_COLUMNS = [
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
] as const;

// ============================================================================
// TableLayout Component
// ============================================================================

export default function TableLayout({
  type,
  data,
  visibleColumns,
  onEdit,
  onDelete,
}: TableLayoutProps) {
  // Debug logging
  console.log('[TableLayout] Rendering:', {
    type,
    dataLength: data?.length || 0,
    visibleColumns,
    data: data?.slice(0, 2) // Log first 2 items
  });

  /**
   * Filter columns based on visibleColumns prop
   * Requirements: 5.5, 5.9
   * 
   * Ensures that:
   * - Only columns in visibleColumns array are displayed
   * - Name column is always visible (cannot be hidden)
   */
  const filteredColumns = useMemo(() => {
    const availableColumns = type === 'tasks' ? TASK_COLUMNS : PROJECT_COLUMNS;
    
    // Ensure name column is always included (Requirement 5.7)
    const columnsToShow = visibleColumns.includes('name')
      ? visibleColumns
      : ['name', ...visibleColumns];
    
    // Filter to only valid columns for this type
    return columnsToShow.filter((col) =>
      availableColumns.includes(col as any)
    );
  }, [type, visibleColumns]);

  console.log('[TableLayout] Filtered columns:', filteredColumns);

  /**
   * Render the DataTable component with filtered columns
   * Requirements: 5.10, 14.6
   */
  return (
    <DataTable
      type={type}
      data={data}
      visibleColumns={filteredColumns}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
