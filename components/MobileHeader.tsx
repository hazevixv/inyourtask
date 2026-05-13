'use client';

import { useState } from 'react';
import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import styles from './MobileHeader.module.css';

interface FilterTab {
  id: string;
  label: string;
}

interface MobileHeaderProps {
  title: string;
  user?: any;
  onLogout?: () => void;
  /** Filter tabs shown below the main header row */
  filterTabs?: FilterTab[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  /** Action buttons shown in the header row (e.g. "+ Task") */
  actions?: React.ReactNode;
  /** Hide header completely */
  hidden?: boolean;
}

export default function MobileHeader({ title, user, onLogout, filterTabs, activeFilter, onFilterChange, actions, hidden }: MobileHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (hidden) return null;

  return (
    <div className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <span className={styles.brandMark} />
            <span className={styles.brandText}>inyourtask</span>
          </div>
        </div>

        <div className={styles.center}>
          <h1 className={styles.title}>{title}</h1>
        </div>

        <div className={styles.right}>
          {actions ? <div className={styles.actions}>{actions}</div> : null}

          <button className={styles.menuBtn} onClick={() => setShowMenu((current) => !current)} title="Open profile menu">
            <span>{user?.username || 'menu'}</span>
          </button>

          {showMenu ? (
            <div className={styles.dropdown}>
              <div className={styles.userInfo}>
                <span className={styles.avatar}>
                  <UserRound size={14} />
                </span>
                <div>
                  <div className={styles.username}>{user?.full_name || user?.username}</div>
                  <div className={styles.role}>{user?.role || 'user'}</div>
                </div>
              </div>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setShowMenu(false);
                  onLogout?.();
                }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {filterTabs && filterTabs.length > 0 ? (
        <div className={styles.filterRow}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ''}`}
              onClick={() => onFilterChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
