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

const PROJECT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Projects' },
];

const projectsCache: Record<string, { ts: number; projects: any[] }> = {};
const PROJECTS_CACHE_TTL = 30_000;

export default function ProjectsPage() {
  const router = useRouter();
  const { user, config, authChecked, loadConfig, showToast, toast, handleLogout, activeWorkspace } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mobileFilter, setMobileFilter] = useState<'all' | 'mine'>('all');
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);
  const openModal = async (id: string | null = null) => {
    setEditId(id);
    if (!config) await loadConfig();
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditId(null); };

  const loadProjects = useCallback(async (force = false) => {
    const workspaceKey = activeWorkspace?.workspace_id || 'default';
    const cached = projectsCache[workspaceKey];

    if (!force && cached && Date.now() - cached.ts < PROJECTS_CACHE_TTL) {
      setProjectsData(cached.projects);
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const res = await fetch('/api/projects', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        const nextProjects = json.data || [];
        projectsCache[workspaceKey] = { ts: Date.now(), projects: nextProjects };
        setProjectsData(nextProjects);
      } else {
        showToast(json.error || 'Failed to load projects', 'error');
      }
    } catch {
      showToast('Error loading projects', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [activeWorkspace?.workspace_id, showToast]);

  useEffect(() => {
    if (!authChecked || !user) return;
    loadProjects();
  }, [authChecked, user, loadProjects]);
  
  /**
   * Handle mobile filter change with type safety
   */
  const handleMobileFilterChange = (id: string) => {
    if (id === 'all' || id === 'mine') {
      setMobileFilter(id);
    }
  };

  /**
   * Apply MobileHeader filter to projects data
   * Requirements: 15.2 - MobileHeader filters combine with ViewSettings filters using AND logic
   * 
   * The MobileHeader filter is applied first to the raw data, then ViewSystem
   * applies its own filters on top of this filtered data (AND logic).
   */
  const filteredProjects = useMemo(() => {
    const projects = projectsData ?? [];
    
    // Apply MobileHeader filter
    if (mobileFilter === 'mine' && user?.username) {
      return projects.filter((project: any) => {
        const assignees = project.assignees
          ? project.assignees.split(',').map((a: string) => a.trim().toLowerCase())
          : [];
        return assignees.includes(user.username.toLowerCase());
      });
    }
    
    return projects;
  }, [projectsData, mobileFilter, user?.username]);

  const handleSave = useCallback(async (formData: any) => {
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/projects/${editId}` : '/api/projects';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.duplicatePrevented
            ? 'Duplicate click ignored. Project only created once.'
            : editId ? 'Project updated!' : 'Project created!',
          json.duplicatePrevented ? 'info' : 'success'
        );
        closeModal();
        await loadProjects(true);
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  }, [editId, loadProjects, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Delete project ${id}?`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          showToast('Project deleted!', 'success');
          await loadProjects(true);
        } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error deleting', 'error'); }
  }, [loadProjects, showToast]);

  if (!authChecked) return <PageLoader />;
  if (pageLoading) return <PageLoader />;

  const mobileActions = (
    <button className={`${headerStyles.actionBtn} ${headerStyles.actionBtnProject}`} onClick={() => openModal()}>
      <Plus size={13} /> Project
    </button>
  );

  return (
    <>
      <AppShell 
        activeTab="projects" 
        user={user} 
        onLogout={handleLogout} 
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => openModal()}
      >
        {/* ViewSystem replaces Projects component - Requirements: 9.2 */}
        <ViewSystem
          type="projects"
          data={filteredProjects}
          currentUser={user?.username}
          mobileFilter={mobileFilter}
          onEdit={openModal}
          onDelete={handleDelete}
        />
      </AppShell>
      <MobileHeader
        title="Projects"
        user={user}
        onLogout={handleLogout}
        actions={mobileActions}
        filterTabs={PROJECT_FILTERS}
        activeFilter={mobileFilter}
        onFilterChange={handleMobileFilterChange}
      />
      <BottomNav activeTab="projects" onTabChange={nav} />
      <FAB onNewTask={() => router.push('/tasks')} onNewProject={() => openModal()} />
      {modalOpen && config && (
        <Modal 
          type="project" 
          editId={editId} 
          data={{ projects: projectsData, tasks: [] }} 
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
