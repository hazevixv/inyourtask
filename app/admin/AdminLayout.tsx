'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users, Bot, Tag, Briefcase, Search, Loader2 } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import styles from './admin.module.css';

type Tab = 'users' | 'agents' | 'roles' | 'organization';

const TAB_CONFIG: { id: Tab; label: string; icon: any; path: string }[] = [
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'agents', label: 'AI Agents', icon: Bot, path: '/admin/agents' },
  { id: 'roles', label: 'Roles & Delivery', icon: Tag, path: '/admin/roles' },
  { id: 'organization', label: 'Organization', icon: Briefcase, path: '/admin/organization' },
];

export default function AdminLayout({ children, extraHeader, activeTab: tab, search, onSearchChange }: { children: React.ReactNode; extraHeader?: React.ReactNode; activeTab: Tab; search?: string; onSearchChange?: (v: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeWorkspace, authChecked, toast, handleLogout, showToast } = useApp();
  const [localSearch, setLocalSearch] = useState('');
  const searchVal = search ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const canAccessAdmin = hasWorkspaceAdminAccess(user as any, activeWorkspace);

  const normalizeAgent = (agent: any) => ({
    ...agent,
    is_personal: Number(agent?.is_personal) === 1,
    is_active: Number(agent?.is_active) === 1,
  });

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  const loadData = useCallback(async () => {
    try {
      const [uRes, aRes, rRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/agents'),
        fetch('/api/admin/roles'),
      ]);
      const uData = await uRes.json();
      const aData = await aRes.json();
      const rData = await rRes.json();
      if (uData.success) setUsers(uData.users);
      if (aData.success) setAgents((aData.agents || []).map(normalizeAgent));
      if (rData.success) setPositions(rData.positions || []);
    } catch {
      // Silently fail - individual pages will handle their own loading
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin) { router.push('/'); return; }
    loadData();
  }, [authChecked, user, canAccessAdmin, router, loadData]);

  const getTabLabel = (t: Tab) => {
    switch (t) {
      case 'users': return `Users (${users.length})`;
      case 'agents': return `AI Agents (${agents.filter(a => !a.is_personal).length}W · ${agents.filter(a => a.is_personal).length}P)`;
      case 'roles': return `Roles & Delivery (${positions.length})`;
      case 'organization': return 'Organization';
    }
  };

  if (!authChecked) return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>;

  return (
    <>
      <AppShell activeTab={`admin-${tab}`} user={user} onLogout={handleLogout} pageTitle="Admin" onNewTask={() => {}} onNewProject={() => {}}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Admin Panel</h1>
            </div>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input placeholder="Search..." value={searchVal} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {TAB_CONFIG.map(t => {
              const Icon = t.icon;
              const isActive = pathname === t.path;
              return (
                <button
                  key={t.id}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => router.push(t.path)}
                >
                  <Icon size={15} /> {getTabLabel(t.id)}
                </button>
              );
            })}
          </div>

          {/* Extra header (e.g., Add Employee button) */}
          {extraHeader}

          {/* Content */}
          {children}
        </div>
      </AppShell>

      <MobileHeader title="Admin" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
