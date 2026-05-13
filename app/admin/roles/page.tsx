'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, RefreshCw, Loader2, Plus, X, Bot } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import styles from '../admin.module.css';
import AdminLayout from '../AdminLayout';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function AvatarDisplay({ src, name, size = 48, isAI = false }: { src?: string | null; name: string; size?: number; isAI?: boolean }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  if (url && !err) {
    return <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }} onError={() => setErr(true)} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: isAI ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.3 }}>
      {isAI ? <Bot size={size * 0.4} /> : getInitials(name)}
    </div>
  );
}

export default function AdminRolesPage() {
  const router = useRouter();
  const { user, activeWorkspace, authChecked, showToast } = useApp();
  const canAccessAdmin = hasWorkspaceAdminAccess(user as any, activeWorkspace);
  const [agents, setAgents] = useState<any[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [roleCounts, setRoleCounts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedAgentForRole, setSelectedAgentForRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  const normalizeAgent = (agent: any) => ({
    ...agent,
    is_personal: Number(agent?.is_personal) === 1,
    is_active: Number(agent?.is_active) === 1,
  });

  const loadData = useCallback(async () => {
    try {
      const aRes = await fetch('/api/admin/agents');
      const aData = await aRes.json();
      if (aData.success) setAgents((aData.agents || []).map(normalizeAgent));
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadRolesData = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
        setAssignments(data.assignments || []);
        setRoleCounts(data.roleCounts || []);
      }
    } catch { showToast('Failed to load roles', 'error'); }
    finally { setRolesLoading(false); }
  }, [showToast]);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin) { router.push('/'); return; }
    loadData();
    loadRolesData();
  }, [authChecked, user, canAccessAdmin, router, loadData, loadRolesData]);

  const syncJobPositions = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/user-roles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync_job_positions' }) });
      const data = await res.json();
      if (data.success) { showToast(`✅ ${data.message}`, 'success'); loadRolesData(); }
      else showToast(data.error || 'Sync failed', 'error');
    } catch { showToast('Error syncing', 'error'); }
    finally { setSyncing(false); }
  };

  const assignAgentToRole = async () => {
    if (!selectedPosition || !selectedAgentForRole) { showToast('Pilih role dan agent', 'error'); return; }
    try {
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: selectedAgentForRole, role_name: selectedPosition }) });
      const data = await res.json();
      if (data.success) { showToast('Agent berhasil di-assign ke role!', 'success'); setSelectedAgentForRole(''); loadRolesData(); }
      else showToast(data.error || 'Failed', 'error');
    } catch { showToast('Error assigning agent', 'error'); }
  };

  const removeAgentFromRole = async (agentId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/admin/roles?agent_id=${encodeURIComponent(agentId)}&role_name=${encodeURIComponent(roleName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Agent removed from role', 'success'); loadRolesData(); }
    } catch { showToast('Error removing', 'error'); }
  };

  if (!authChecked) return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>;

  return (
    <>
      <AdminLayout activeTab="roles">
        {loading ? (
          <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>
        ) : (
          <div>
            <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(16,185,129,0.06))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>Sync Job Positions → Roles</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: 2 }}>Otomatis sync job_position setiap karyawan ke tabel user_roles agar AI agents bisa di-deliver</div>
              </div>
              <button onClick={syncJobPositions} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1 }}>
                {syncing ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
                {syncing ? 'Syncing...' : 'Sync Sekarang'}
              </button>
            </div>

            <div style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>🤖 Assign AI Agent ke Job Position</div>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 16 }}>Pilih job position dan AI agent. Semua karyawan dengan job position tersebut akan otomatis mendapat akses ke agent itu di Chat.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>Job Position / Role</label>
                  <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                    <option value="">-- Pilih Job Position --</option>
                    {positions.map(p => { const count = roleCounts.find((r: any) => r.job_position === p)?.user_count || 0; return <option key={p} value={p}>{p} ({count} karyawan)</option>; })}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>AI Agent</label>
                  <select value={selectedAgentForRole} onChange={e => setSelectedAgentForRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                    <option value="">-- Pilih AI Agent --</option>
                    {agents.filter(a => !a.is_personal && a.is_active).map(a => <option key={a.agent_id} value={a.agent_id}>{a.name} ({a.role})</option>)}
                  </select>
                </div>
                <button onClick={assignAgentToRole} disabled={!selectedPosition || !selectedAgentForRole} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: (!selectedPosition || !selectedAgentForRole) ? 'not-allowed' : 'pointer', opacity: (!selectedPosition || !selectedAgentForRole) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Assign Agent
                </button>
              </div>
            </div>

            {rolesLoading ? <div className={styles.loading}><Loader2 size={20} className={styles.spin} /></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {positions.map(pos => {
                  const posAgents = assignments.filter((a: any) => a.role_name === pos);
                  const count = roleCounts.find((r: any) => r.job_position === pos)?.user_count || 0;
                  return (
                    <div key={pos} style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: posAgents.length > 0 ? 12 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{pos}</div>
                          <span style={{ padding: '2px 8px', background: 'rgba(16,185,129,0.08)', color: '#059669', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{count} karyawan</span>
                        </div>
                        {posAgents.length === 0 && <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>Belum ada agent</span>}
                      </div>
                      {posAgents.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {posAgents.map((a: any) => (
                            <div key={a.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                              <AvatarDisplay src={a.avatar} name={a.agent_name} size={28} isAI />
                              <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{a.agent_name}</div>
                                <div style={{ fontSize: '0.6875rem', color: '#7c3aed', fontFamily: 'DM Sans, sans-serif' }}>{a.agent_role}</div>
                              </div>
                              <button onClick={() => removeAgentFromRole(a.agent_id, pos)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 4 }} title="Remove"><X size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </AdminLayout>
    </>
  );
}
