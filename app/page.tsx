'use client';

import { useState } from 'react';
import AppShell from '@/components/Sidebar';
import Overview from '@/components/Overview';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import PageLoader from '@/components/PageLoader';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import FAB from '@/components/FAB';
import { useApp } from '@/lib/AppContext';
import { Plus } from 'lucide-react';
import styles from '@/components/Sidebar.module.css';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { user, data, config, authChecked, loadData, loadConfig, showToast, toast, handleLogout } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'task' | 'project'>('task');
  const [editId, setEditId] = useState<string | null>(null);

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);
  const openModal = (type: 'task' | 'project', id: string | null = null) => { setModalType(type); setEditId(id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditId(null); };

  const handleSave = async (formData: any) => {
    try {
      const endpoint = modalType === 'task' ? '/api/tasks' : '/api/projects';
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${endpoint}/${editId}` : endpoint;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(editId ? `${modalType} updated!` : `${modalType} created!`, 'success');
        closeModal();
        await loadData();
        if (modalType === 'project') await loadConfig();
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  };

  const handleDelete = async (type: 'task' | 'project', id: string) => {
    if (!confirm(`Delete ${type} ${id}?`)) return;
    try {
      const res = await fetch(`/api/${type === 'task' ? 'tasks' : 'projects'}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast(`${type} deleted!`, 'success');
        await loadData();
        if (type === 'project') await loadConfig();
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error deleting', 'error'); }
  };

  if (!authChecked) return <PageLoader />;

  const topbarRight = (
    <>
      <button className={styles.topbarBtnSuccess} onClick={() => openModal('task')}>
        <Plus size={13} /> Task
      </button>
      <button className={styles.topbarBtnPrimary} onClick={() => openModal('project')}>
        <Plus size={13} /> Project
      </button>
    </>
  );

  return (
    <>
      <AppShell 
        activeTab="overview" 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={loadData} 
        pageTitle="Overview" 
        topbarRight={topbarRight}
        onNewTask={() => openModal('task')} 
        onNewProject={() => openModal('project')}
      >
        <Overview data={data} user={user} />
      </AppShell>
      {/* Mobile */}
      <MobileHeader title="Overview" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="overview" onTabChange={nav} />
      <FAB onNewTask={() => openModal('task')} onNewProject={() => openModal('project')} />
      {modalOpen && data && config && (
        <Modal 
          type={modalType} 
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
