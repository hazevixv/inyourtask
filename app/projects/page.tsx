'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/Sidebar';
import ViewSystem from '@/components/ViewSystem';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import FAB from '@/components/FAB';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import { useApp } from '@/lib/AppContext';
import { Plus } from 'lucide-react';
import styles from '@/components/Sidebar.module.css';
import headerStyles from '@/components/MobileHeader.module.css';

const PROJECT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Projects' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { user, data, config, authChecked, loadData, loadConfig, showToast, toast, handleLogout } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mobileFilter, setMobileFilter] = useState<'all' | 'mine'>('all');

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);
  const openModal = (id: string | null = null) => { setEditId(id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditId(null); };
  
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
    const projects = data?.projects ?? [];
    
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
  }, [data?.projects, mobileFilter, user?.username]);

  const handleSave = async (formData: any) => {
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/projects/${editId}` : '/api/projects';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(editId ? 'Project updated!' : `Project created!`, 'success');
        closeModal();
        await Promise.all([loadData(), loadConfig()]);
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete project ${id}?`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Project deleted!', 'success');
        await Promise.all([loadData(), loadConfig()]);
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error deleting', 'error'); }
  };

  if (!authChecked) return <PageLoader />;

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
      {modalOpen && data && config && (
        <Modal 
          type="project" 
          editId={editId} 
          data={data} 
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
