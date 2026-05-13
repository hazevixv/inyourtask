'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import OrganizationalChart from '@/components/OrganizationalChart';
import { useApp } from '@/lib/AppContext';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import styles from '../admin.module.css';
import AdminLayout from '../AdminLayout';

export default function AdminOrganizationPage() {
  const router = useRouter();
  const { user, activeWorkspace, authChecked, showToast } = useApp();
  const canAccessAdmin = hasWorkspaceAdminAccess(user as any, activeWorkspace);
  const [loading, setLoading] = useState(true);

  const init = useCallback(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin) { router.push('/'); return; }
    setLoading(false);
  }, [authChecked, user, canAccessAdmin, router]);

  useEffect(() => {
    init();
  }, [init]);

  if (!authChecked || loading) return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>;

  return (
    <>
      <AdminLayout activeTab="organization">
        <OrganizationalChart showToast={showToast} />
      </AdminLayout>
    </>
  );
}
