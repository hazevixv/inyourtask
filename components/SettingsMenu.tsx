'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BrainCircuit,
  Bot,
  Building2,
  CalendarDays,
  type LucideIcon,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Tag,
  UserRound,
  Users,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import styles from './SettingsMenu.module.css';

type Variant = 'sidebar' | 'bottom';

type MenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export default function SettingsMenu({ variant = 'sidebar', className }: { variant?: Variant; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeWorkspace, handleLogout } = useApp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isWorkspaceAdmin = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const isPlatformSuperAdmin = isPlatformSuperAdminUser(user);

  const isActiveRoute = useMemo(() => {
    return [
      '/profile',
      '/tracking',
      '/brain',
      '/admin',
      '/superadmin',
      '/super-admin',
    ].some((route) => pathname === route || pathname?.startsWith(`${route}/`));
  }, [pathname]);

  const baseItems: MenuItem[] = [
    { label: 'Profile', path: '/profile', icon: UserRound },
    { label: 'Workspace Settings', path: '/brain', icon: BrainCircuit },
    { label: 'Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'Tracking', path: '/tracking', icon: Activity },
    { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
  ];

  const adminItems: MenuItem[] = [
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'AI Agents', path: '/brain', icon: Bot },
    { label: 'Roles', path: '/admin/roles', icon: Tag },
    { label: 'Organization', path: '/admin/organization', icon: Building2 },
  ];

  const goTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className={`${styles.wrap} ${variant === 'bottom' ? styles.bottom : styles.sidebar} ${className || ''}`}>
      <button
        type="button"
        className={`${variant === 'bottom' ? styles.triggerBottom : styles.triggerSidebar} ${isActiveRoute ? styles.triggerActive : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open settings menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.triggerIcon}>
          <SettingsIcon size={variant === 'bottom' ? 20 : 15} />
        </span>
        {variant === 'bottom' && <span className={styles.triggerLabel}>Settings</span>}
      </button>

      {open && (
        <div className={`${styles.menu} ${variant === 'bottom' ? styles.menuBottom : styles.menuSidebar}`} role="menu">
          <div className={styles.menuHeader}>
            <div className={styles.workspaceName}>{activeWorkspace?.name || 'Workspace'}</div>
            <div className={styles.workspaceMeta}>
              {activeWorkspace?.role || 'member'} / {activeWorkspace?.type || 'workspace'}
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Workspace</div>
            {baseItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`${styles.menuItem} ${active ? styles.menuItemActive : ''}`}
                  onClick={() => goTo(item.path)}
                >
                  <span className={styles.menuIcon}><Icon size={16} /></span>
                  <span className={styles.menuText}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {isWorkspaceAdmin && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>Admin</div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`${styles.menuItem} ${active ? styles.menuItemActive : ''}`}
                    onClick={() => goTo(item.path)}
                  >
                    <span className={styles.menuIcon}><Icon size={16} /></span>
                    <span className={styles.menuText}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isPlatformSuperAdmin && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>Platform</div>
              <button
                type="button"
                className={`${styles.menuItem} ${(pathname?.startsWith('/superadmin') || pathname?.startsWith('/super-admin')) ? styles.menuItemActive : ''}`}
                onClick={() => goTo('/super-admin/dashboard')}
              >
                <span className={styles.menuIcon}><Shield size={16} /></span>
                <span className={styles.menuText}>Super Admin</span>
              </button>
            </div>
          )}

          {handleLogout && (
            <div className={styles.logoutRow}>
              <button type="button" className={styles.logoutButton} onClick={() => { setOpen(false); handleLogout(); }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
