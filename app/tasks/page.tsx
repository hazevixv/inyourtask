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

const TASK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Tasks' },
];

export default function TasksPage() {
  const router = useRouter();
  const { user, data, config, authChecked, loadData, showToast, toast, handleLogout } = useApp();
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
   * Apply MobileHeader filter to tasks data
   * Requirements: 15.2 - MobileHeader filters combine with ViewSettings filters using AND logic
   * 
   * The MobileHeader filter is applied first to the raw data, then ViewSystem
   * applies its own filters on top of this filtered data (AND logic).
   */
  const filteredTasks = useMemo(() => {
    const tasks = data?.tasks ?? [];

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
  }, [data, mobileFilter, user?.username]);

  const handleSave = async (formData: any) => {
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/tasks/${editId}` : '/api/tasks';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(editId ? 'Task updated!' : `Task created!`, 'success');
        closeModal();
        loadData();
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete task ${id}?`)) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('Task deleted!', 'success'); loadData(); }
      else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error deleting', 'error'); }
  };

  if (!authChecked) return <PageLoader />;

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
          projects={data?.projects ?? []}
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
      {modalOpen && data && config && (
        <Modal 
          type="task" 
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
