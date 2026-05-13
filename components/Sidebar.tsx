'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Bell, BrainCircuit, Building2, Bot, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, FolderKanban,
  LayoutGrid, LogOut, MessageCircle, Plus, RefreshCw, Settings, Sparkles, Tag, UserRound, Users, Shield
} from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  user?: any;
  onLogout?: () => void;
  onRefresh?: () => void;
  pageTitle?: string;
  topbarRight?: React.ReactNode;
  children: React.ReactNode;
  onNewTask?: () => void;
  onNewProject?: () => void;
}

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',    icon: LayoutGrid,    path: '/' },
  { id: 'projects',  label: 'Projects',     icon: FolderKanban,  path: '/projects' },
  { id: 'tasks',     label: 'Tasks',        icon: CheckSquare,   path: '/tasks' },
  { id: 'chat',      label: 'Chat',         icon: MessageCircle, path: '/chat' },
  { id: 'tracking',  label: 'Report',       icon: Activity,      path: '/tracking' },
];

const UTIL_ITEMS = [
  { id: 'calendar',    label: 'Calendar',     icon: CalendarDays, path: '/calendar' },
  { id: 'ai',          label: 'AI Assistant', icon: Sparkles,     path: '/ai-assistant' },
];

const BASE_MENU: { label: string; path: string; icon: any }[] = [
  { label: 'Profile', path: '/profile', icon: UserRound },
  { label: 'Workspace Settings', path: '/brain', icon: BrainCircuit },
  { label: 'Tracking', path: '/tracking', icon: Activity },
];

const ADMIN_MENU: { label: string; path: string; icon: any }[] = [
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'AI Agents', path: '/admin/agents', icon: Bot },
  { label: 'Roles', path: '/admin/roles', icon: Tag },
  { label: 'Organization', path: '/admin/organization', icon: Building2 },
];

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AppShell({
  activeTab, user, onLogout, onRefresh, pageTitle, topbarRight, children, onNewTask, onNewProject
}: SidebarProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace, handleLogout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const isSuperAdmin = isPlatformSuperAdminUser(user);

  const isOnSettingsPage = ['/profile', '/tracking', '/brain', '/admin', '/superadmin', '/super-admin']
    .some(r => pathname === r || pathname?.startsWith(r + '/'));

  const createWorkspace = async () => {
    const defaultName = `${user?.full_name || user?.username || 'My'} Workspace`;
    const workspaceName = window.prompt('Nama workspace baru', defaultName);
    if (!workspaceName || !workspaceName.trim()) return;
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: workspaceName.trim(), type: 'team' })
      });
      const data = await res.json();
      if (!data.success) { window.alert(data.error || 'Gagal membuat workspace'); return; }
      window.location.reload();
    } catch { window.alert('Gagal membuat workspace'); }
  };

  useEffect(() => {
    const loadNotifCount = async () => {
      try {
        const res = await fetch('/api/notifications?unread=1&limit=1');
        const data = await res.json();
        if (data.success) setUnreadNotifs(data.unreadCount || 0);
      } catch {}
    };
    loadNotifCount();
    const interval = setInterval(loadNotifCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideGear = gearRef.current && !gearRef.current.contains(target);
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      if (isOutsideGear && isOutsideMenu) close();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    if (open) {
      document.addEventListener('mousedown', onOut);
      document.addEventListener('keydown', onEsc);
    }
    return () => {
      document.removeEventListener('mousedown', onOut);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, close]);

  useEffect(() => { close(); }, [pathname, close]);

  useEffect(() => {
    if (!open || !gearRef.current || !menuRef.current) return;
    const rect = gearRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    menu.style.left = `${Math.min(rect.right + 8, window.innerWidth - 260)}px`;
    menu.style.top = 'auto';
    menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    menu.style.maxHeight = `${Math.max(200, rect.top - 20)}px`;
  }, [open]);

  const goto = (path: string) => { close(); router.push(path); };

  const renderMenuItem = (item: { label: string; path: string; icon: any }) => {
    const Icon = item.icon;
    const active = pathname === item.path || pathname?.startsWith(item.path + '/');
    return (
      <button key={item.path} type="button" className={`${styles.mnuItem} ${active ? styles.mnuItemActive : ''}`} onClick={() => goto(item.path)}>
        <Icon size={16} />
        <span>{item.label}</span>
      </button>
    );
  };

  const sbClass = `${styles.sidebar} ${collapsed ? styles.collapsed : ''}`;
  const mainClass = `${styles.main} ${collapsed ? styles.mainCollapsed : ''}`;

  return (
    <div className={styles.shell}>
      <aside className={sbClass}>
        {/* Top Section: Workspace Title + Collapse + Long Logo */}
        {collapsed ? (
          <div className={styles.topCollapsed}>
            <button className={styles.topCollapsedLogo} onClick={() => router.push('/')}>
              <img src="/logo.png" alt="inyourtask" className={styles.topCollapsedImg} />
            </button>
            <button type="button" className={styles.topCollapseBtn} onClick={() => setCollapsed(v => !v)}
              title="Expand sidebar">
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className={styles.topExpanded}>
            {/* Long logo on top */}
            <button className={styles.topLogoRow} onClick={() => router.push('/')}>
              <img src="/logo-long.png" alt="inyourtask" className={styles.topLongLogo} />
            </button>
            {/* Row: Workspace name + Collapse button */}
            <div className={styles.topRow}>
              <div className={styles.topWsInfo} onClick={() => router.push('/brain')} style={{ cursor: 'pointer' }}>
                <div className={styles.topWsName}>{activeWorkspace?.name || 'Workspace'}</div>
              </div>
              <button type="button" className={styles.topCollapseBtnEx} onClick={() => setCollapsed(v => !v)}
                title="Collapse sidebar">
                <ChevronLeft size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.navSection}>
          {!collapsed && <div className={styles.navLabel}>Menu</div>}
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`} onClick={() => router.push(item.path)} title={collapsed ? item.label : undefined}>
                <span className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}><Icon size={18} /></span>
                {!collapsed && <span className={styles.navLabelText}>{item.label}</span>}
                {isActive && <span className={styles.navDot} />}
              </button>
            );
          })}
        </nav>

        <div className={styles.divider} />

        {/* Utility icons row */}
        <div className={styles.utilRow}>
          {UTIL_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} className={`${styles.utilBtn} ${isActive ? styles.utilBtnActive : ''}`}
                onClick={() => router.push(item.path)} title={item.label}>
                <Icon size={16} />
              </button>
            );
          })}
          {onRefresh && (
            <button className={styles.utilBtn} onClick={onRefresh} title="Refresh data">
              <RefreshCw size={16} />
            </button>
          )}
          <button className={styles.utilBtn} onClick={() => router.push('/notifications')} title="Notifications"
            style={{ position: 'relative' }}>
            <Bell size={16} />
            {unreadNotifs > 0 && <span className={styles.notifBadge}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</span>}
          </button>
        </div>

        {!collapsed && (
          <div className={styles.createButtons}>
            {onNewTask && <button className={`${styles.createBtn} ${styles.createBtnTask}`} onClick={onNewTask} title="New Task"><Plus size={14} /><span>Task</span></button>}
            {onNewProject && <button className={`${styles.createBtn} ${styles.createBtnProject}`} onClick={onNewProject} title="New Project"><Plus size={14} /><span>Project</span></button>}
          </div>
        )}

        {/* Workspace selector */}
        {!collapsed && (
          <div className={styles.wsSection}>
            <div className={styles.wsLabel}>Workspace</div>
            <select value={activeWorkspace?.workspace_id || ''} onChange={(e) => setActiveWorkspace(e.target.value)} className={styles.wsSelect}>
              {workspaces.length === 0 ? <option value="">No workspace</option> :
                workspaces.map((ws) => <option key={ws.workspace_id} value={ws.workspace_id}>{ws.name}</option>)
              }
            </select>
            <button type="button" onClick={createWorkspace} className={styles.wsAdd}>+ New</button>
            {activeWorkspace ? <div className={styles.wsMeta}>{activeWorkspace.role} &bull; {activeWorkspace.type}</div> : null}
          </div>
        )}

        {collapsed && (
          <div className={styles.wsSectionCollapsed}>
            <button type="button" onClick={createWorkspace} className={styles.wsAddMini} title="New workspace">
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* User */}
        <div className={styles.userSection}>
          {user && (
            <div className={`${styles.userCard} ${collapsed ? styles.userCardCollapsed : ''}`}>
              <div className={styles.userAvatar} onClick={() => goto('/profile')} style={{ cursor: 'pointer' }}>
                {user.avatar ? (
                  <img src={getAvatarUrl(user.avatar)} alt={user.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => { const img = e.currentTarget; if (img.dataset.fallbackApplied) return; img.dataset.fallbackApplied = '1'; img.src = '/default-avatar.svg'; }} />
                ) : getInitials(user.full_name || user.username)}
              </div>
              {!collapsed && (
                <div className={styles.userInfo} onClick={() => goto('/profile')} style={{ cursor: 'pointer' }}>
                  <div className={styles.userName}>{user.full_name || user.username}</div>
                  <div className={styles.userRole}>{activeWorkspace?.role || user.role}</div>
                </div>
              )}
              <button ref={gearRef} type="button" className={`${styles.gearBtn} ${isOnSettingsPage ? styles.gearBtnActive : ''}`}
                onClick={() => setOpen(v => !v)} aria-label="Settings"><Settings size={15} /></button>
              {!collapsed && onLogout && <button className={styles.logoutBtn} onClick={onLogout} title="Logout"><LogOut size={13} /></button>}
            </div>
          )}
        </div>
      </aside>

      <div className={mainClass}>
        <main className={styles.content}>{children}</main>
      </div>

      {open && (
        <div ref={menuRef} className={styles.gearMenu} onClick={(e) => e.stopPropagation()}>
          <div className={styles.gearHeader}>
            <div className={styles.gearName}>{activeWorkspace?.name || 'Workspace'}</div>
            <div className={styles.gearMeta}>{activeWorkspace?.role || 'member'} / {activeWorkspace?.type || 'workspace'}</div>
          </div>
          <div className={styles.gearGroup}>
            <div className={styles.gearGroupLabel}>Workspace</div>
            {BASE_MENU.map(renderMenuItem)}
          </div>
          {isAdmin && (
            <div className={styles.gearGroup}>
              <div className={styles.gearGroupLabel}>Admin</div>
              {ADMIN_MENU.map(renderMenuItem)}
            </div>
          )}
          {isSuperAdmin && (
            <div className={styles.gearGroup}>
              <div className={styles.gearGroupLabel}>Platform</div>
              <button type="button" className={`${styles.mnuItem} ${(pathname?.startsWith('/superadmin') || pathname?.startsWith('/super-admin')) ? styles.mnuItemActive : ''}`}
                onClick={() => goto('/super-admin/dashboard')}><Shield size={16} /><span>Super Admin</span></button>
            </div>
          )}
          <div className={styles.gearLogout}>
            <button type="button" className={styles.gearLogoutBtn} onClick={() => { close(); handleLogout?.(); }}>
              <LogOut size={16} /><span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
