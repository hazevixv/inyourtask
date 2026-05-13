'use client';

/**
 * ViewToolbar Component
 * 
 * Toolbar with layout toggle and settings button.
 * Displays active layout mode indicator and provides access to view settings.
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6, 4.1
 */

import styles from './ViewToolbar.module.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface ViewToolbarProps {
  layout: 'table' | 'list';
  onLayoutToggle: () => void;
  onOpenSettings: () => void;
}

// ============================================================================
// ViewToolbar Component
// ============================================================================

export default function ViewToolbar({
  layout,
  onLayoutToggle,
  onOpenSettings,
}: ViewToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Layout Toggle Button - Requirements: 1.1, 1.2, 1.5 */}
      <div className={styles.layoutToggle}>
        <button
          onClick={onLayoutToggle}
          className={styles.toggleButton}
          aria-label={`Switch to ${layout === 'table' ? 'list' : 'table'} view`}
          title={`Switch to ${layout === 'table' ? 'list' : 'table'} view`}
        >
          {/* Table Icon */}
          <svg
            className={`${styles.icon} ${layout === 'table' ? styles.active : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>

          {/* List Icon */}
          <svg
            className={`${styles.icon} ${layout === 'list' ? styles.active : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        {/* Active Layout Indicator - Requirements: 1.5 */}
        <span className={styles.layoutLabel}>
          {layout === 'table' ? 'Table' : 'List'} View
        </span>
      </div>

      {/* View Settings Button - Requirements: 1.6, 4.1 */}
      <button
        onClick={onOpenSettings}
        className={styles.settingsButton}
        aria-label="Open view settings"
        title="View Settings"
      >
        {/* Settings Icon */}
        <svg
          className={styles.icon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m5.196-15.804l-4.243 4.243m-5.906 5.906l-4.243 4.243m15.804-5.196l-4.243-4.243m-5.906 5.906l-4.243-4.243" />
        </svg>
      </button>
    </div>
  );
}
