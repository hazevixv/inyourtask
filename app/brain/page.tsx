'use client';

import { useRouter } from 'next/navigation';
import AppShell from '@/components/Sidebar';
import BrainSettings from '@/components/BrainSettings';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import { useApp } from '@/lib/AppContext';

export default function BrainPage() {
  const router = useRouter();
  const { user, config, authChecked, loadConfig, loadData, showToast, toast, handleLogout } = useApp();

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell 
        activeTab="brain" 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={loadConfig} 
        pageTitle="Settings"
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => router.push('/projects')}
      >
        {config ? (
          <BrainSettings config={config} onUpdate={async () => { await Promise.all([loadConfig(), loadData()]); }} showToast={showToast} user={user} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </AppShell>
      <MobileHeader title="Settings" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="brain" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
