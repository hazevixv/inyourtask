'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AppShell from '@/components/Sidebar';
import Toast from '@/components/Toast';
import FAB from '@/components/FAB';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import { useApp } from '@/lib/AppContext';
import { Plus } from 'lucide-react';
import styles from '@/components/Sidebar.module.css';
import headerStyles from '@/components/MobileHeader.module.css';

const ViewSystem = dynamic(() => import('@/components/ViewSystem'), {
  ssr: false,
  loading: () => <PageLoader />
});

const Modal = dynamic(() => import('@/components/Modal'), {
  ssr: false
});

const TASK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Tasks' },
];

const tasksCache: Record<string, { ts: number; tasks: any[]; projects: any[] }> = {};
const TASKS_CACHE_TTL = 30_000;

export default function TasksPage() {
  const router = useRouter();
  const { user, config, authChecked, loadConfig, showToast, toast, handleLogout, activeWorkspace } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mobileFilter, setMobileFilter] = useState<'all' | 'mine'>('all');
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);
  const openModal = async (id: string | null = null) => {
    setEditId(id);
    if (!config) await loadConfig();
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditId(null); };

  const loadTasksPageData = useCallback(async (force = false) => {
    const workspaceKey = activeWorkspace?.workspace_id || 'default';
    const cached = tasksCache[workspaceKey];

    if (!force && cached && Date.now() - cached.ts < TASKS_CACHE_TTL) {
      setTasksData(cached.tasks);
      setProjectsData(cached.projects);
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks', { credentials: 'include' }),
        fetch('/api/projects', { credentials: 'include' })
      ]);
      const [tasksJson, projectsJson] = await Promise.all([tasksRes.json(), projectsRes.json()]);

      if (!tasksJson.success) throw new Error(tasksJson.error || 'Failed to load tasks');
      if (!projectsJson.success) throw new Error(projectsJson.error || 'Failed to load projects');

      const nextTasks = tasksJson.data || [];
      const nextProjects = projectsJson.data || [];
      tasksCache[workspaceKey] = { ts: Date.now(), tasks: nextTasks, projects: nextProjects };
      setTasksData(nextTasks);
      setProjectsData(nextProjects);
    } catch (error: any) {
      showToast(error?.message || 'Error loading tasks', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [activeWorkspace?.workspace_id, showToast]);

  useEffect(() => {
    if (!authChecked || !user) return;
    loadTasksPageData();
  }, [authChecked, user, loadTasksPageData]);
  
  /**
   * Handle mobile filter change with type safety
   */
  const handleMobileFilterChange = (id: string) => {
    if (id === 'all' || id === 'mine') {
      setMobileFilter(id);
    }
  };

  /**
   * Apply MobileHeader filter to tasks data
   * Requirements: 15.2 - MobileHeader filters combine with ViewSettings filters using AND logic
   * 
   * The MobileHeader filter is applied first to the raw data, then ViewSystem
   * applies its own filters on top of this filtered data (AND logic).
   */
  const filteredTasks = useMemo(() => {
    const tasks = tasksData ?? [];

    // Apply MobileHeader filter
    if (mobileFilter === 'mine' && user?.username) {
      return tasks.filter((task: any) => {
        const assignees = task.assignees
          ? task.assignees.split(',').map((a: string) => a.trim().toLowerCase())
          : [];
        return assignees.includes(user.username.toLowerCase());
      });
    }
    
    return tasks;
  }, [tasksData, mobileFilter, user?.username]);

  const handleSave = useCallback(async (formData: any) => {
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/tasks/${editId}` : '/api/tasks';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.duplicatePrevented
            ? 'Duplicate click ignored. Task only created once.'
            : editId ? 'Task updated!' : 'Task created!',
          json.duplicatePrevented ? 'info' : 'success'
        );
        closeModal();
        await loadTasksPageData(true);
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  }, [editId, loadTasksPageData, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Delete task ${id}?`)) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('Task deleted!', 'success'); await loadTasksPageData(true); }
      else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error deleting', 'error'); }
  }, [loadTasksPageData, showToast]);

  if (!authChecked) return <PageLoader />;
  if (pageLoading) return <PageLoader />;

  const mobileActions = (
    <button className={`${headerStyles.actionBtn} ${headerStyles.actionBtnTask}`} onClick={() => openModal()}>
      <Plus size={13} /> Task
    </button>
  );

  return (
    <>
      <AppShell 
        activeTab="tasks" 
        user={user} 
        onLogout={handleLogout} 
        onNewTask={() => openModal()} 
        onNewProject={() => router.push('/projects')}
      >
        {/* ViewSystem replaces Tasks component - Requirements: 9.1 */}
        <ViewSystem
          type="tasks"
          data={filteredTasks}
          projects={projectsData}
          currentUser={user?.username}
          mobileFilter={mobileFilter}
          onEdit={openModal}
          onDelete={handleDelete}
        />
      </AppShell>
      <MobileHeader
        title="Tasks"
        user={user}
        onLogout={handleLogout}
        actions={mobileActions}
        filterTabs={TASK_FILTERS}
        activeFilter={mobileFilter}
        onFilterChange={handleMobileFilterChange}
      />
      <BottomNav activeTab="tasks" onTabChange={nav} />
      <FAB onNewTask={() => openModal()} onNewProject={() => router.push('/projects')} />
      {modalOpen && config && (
        <Modal 
          type="task" 
          editId={editId} 
          data={{ tasks: tasksData, projects: projectsData }} 
          config={config} 
          currentUser={user?.username} 
          onClose={closeModal} 
          onSave={handleSave}
          onMinimize={closeModal}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
