'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import AppShell from '@/components/Sidebar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import { useApp } from '@/lib/AppContext';

const AIAssistant = dynamicImport(() => import('@/components/AIAssistant'), {
  ssr: false,
  loading: () => <PageLoader />
});

export default function AIAssistantPage() {
  const router = useRouter();
  const { user, data, config, authChecked, loadData, loadConfig, showToast, toast, handleLogout } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'task' | 'project'>('task');
  const [modalInitialValues, setModalInitialValues] = useState<Record<string, any> | null>(null);

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);

  const openModal = (type: 'task' | 'project', initialValues?: Record<string, any> | null) => {
    setModalType(type);
    setModalInitialValues(initialValues || null);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setModalInitialValues(null); };

  const handleSave = async (formData: any) => {
    try {
      const endpoint = modalType === 'task' ? '/api/tasks' : '/api/projects';
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.duplicatePrevented
            ? `Duplicate click ignored. ${modalType} only created once.`
            : `${modalType} created!`,
          json.duplicatePrevented ? 'info' : 'success'
        );
        closeModal();
        await loadData();
        if (modalType === 'project') await loadConfig();
      } else showToast(`Error: ${json.error}`, 'error');
    } catch { showToast('Error saving', 'error'); }
  };

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell 
        activeTab="ai" 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={loadData} 
        pageTitle="AI Assistant"
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => router.push('/projects')}
      >
        <AIAssistant onOpenModal={openModal} user={user} />
      </AppShell>
      <MobileHeader title="AI Assistant" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="ai" onTabChange={nav} />
      {modalOpen && data && config && (
        <Modal 
          type={modalType} 
          editId={null} 
          data={data} 
          config={config} 
          currentUser={user?.username} 
          initialValues={modalInitialValues} 
          onClose={closeModal} 
          onSave={handleSave}
          onMinimize={closeModal}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
