'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Save, X, Loader2, Plus, RefreshCw, Tag, Edit2, Mail, Phone, Building2, Eye, EyeOff, Shield } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import styles from '../admin.module.css';
import AdminLayout from '../AdminLayout';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function AvatarDisplay({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  if (url && !err) {
    return <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }} onError={() => setErr(true)} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.3 }}>
      {getInitials(name)}
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, activeWorkspace, authChecked, showToast } = useApp();
  const canAccessAdmin = hasWorkspaceAdminAccess(user as any, activeWorkspace);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{ type: 'user'; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUserOrgModal, setShowUserOrgModal] = useState(false);
  const [userOrgTarget, setUserOrgTarget] = useState<any>(null);
  const [userOrgAssignments, setUserOrgAssignments] = useState<any[]>([]);
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [addingOrgUnit, setAddingOrgUnit] = useState('');
  const [addingOrgRole, setAddingOrgRole] = useState('staff');
  const [addingIsPrimary, setAddingIsPrimary] = useState(false);
  const [userOrgLoading, setUserOrgLoading] = useState(false);

  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'active' | 'inactive' | 'admin'>('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState({
    username: '', password: '', full_name: '', email: '', phone: '',
    job_position: '', organization: '', employee_id: '', role: 'user',
  });
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [workspaceHealth, setWorkspaceHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [assignmentSuggestions, setAssignmentSuggestions] = useState<any[]>([]);
  const [suggestionsSummary, setSuggestionsSummary] = useState<any>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [applyingSuggestions, setApplyingSuggestions] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uRes = await fetch('/api/admin/users');
      const uData = await uRes.json();
      if (uData.success) {
        const normalized = (uData.users || []).map((u: any) => ({
          ...u,
          display_job_position: u.primary_job_position || u.job_position || activeWorkspace?.name || activeWorkspace?.workspace_name || 'Workspace',
          display_organization: u.primary_organization || u.organization || activeWorkspace?.name || activeWorkspace?.workspace_name || 'Workspace'
        }));
        setUsers(normalized);
      }
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [activeWorkspace?.name, activeWorkspace?.workspace_name, showToast]);

  const loadOrgUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/tree');
      const data = await res.json();
      if (data.success && data.flatList) setOrgUnits(data.flatList);
    } catch {}
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (!canAccessAdmin) { router.push('/'); return; }
    loadData();
    loadOrgUnits();
    fetch('/api/admin/sync-primary-info', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.success && d.results?.length > 0) loadData(); })
      .catch(() => {});
  }, [authChecked, user, canAccessAdmin, router, loadData, loadOrgUnits]);

  const openUserOrgModal = async (u: any) => {
    setUserOrgTarget(u);
    setUserOrgLoading(true);
    setShowUserOrgModal(true);
    try {
      const res = await fetch(`/api/admin/user-org-assignments?username=${u.username}`);
      const data = await res.json();
      if (data.success) {
        setUserOrgAssignments(data.assignments || []);
        const hasPrimary = data.assignments?.some((a: any) => a.is_primary);
        const needsSync = hasPrimary && (!u.display_job_position || u.display_organization === 'Unknown Company' || !u.display_organization);
        if (needsSync) {
          fetch('/api/admin/sync-primary-info', { method: 'POST' })
            .then(r => r.json())
            .then(d => { if (d.success) loadData(); })
            .catch(() => {});
        }
      }
    } catch {}
    setUserOrgLoading(false);
  };

  const addOrgAssignmentToUser = async () => {
    if (!addingOrgUnit || !userOrgTarget) return;
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_unit_id: addingOrgUnit, username: userOrgTarget.username, role: addingOrgRole, is_primary: addingIsPrimary })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Assignment added!', 'success');
        setAddingOrgUnit('');
        setAddingOrgRole('staff');
        setAddingIsPrimary(false);
        openUserOrgModal(userOrgTarget);
        if (addingIsPrimary) loadData();
      } else {
        showToast(data.error || 'Failed to add assignment', 'error');
      }
    } catch { showToast('Error adding assignment', 'error'); }
  };

  const removeOrgAssignmentFromUser = async (orgUnitId: number) => {
    if (!userOrgTarget) return;
    try {
      const res = await fetch(`/api/admin/team-members?org_unit_id=${orgUnitId}&username=${encodeURIComponent(userOrgTarget.username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Assignment removed', 'success');
        setUserOrgAssignments(prev => prev.filter(a => a.org_unit_id !== orgUnitId));
      } else {
        showToast(data.error || 'Failed to remove', 'error');
      }
    } catch { showToast('Error removing assignment', 'error'); }
  };

  const updateOrgAssignmentRole = async (orgUnitId: number, newRole: string, isPrimary: boolean = false) => {
    if (!userOrgTarget) return;
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_unit_id: orgUnitId, username: userOrgTarget.username, role: newRole, is_primary: isPrimary })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${isPrimary ? 'Primary assignment updated!' : `Role updated to ${newRole}!`}`, 'success');
        setUserOrgAssignments(prev => prev.map(a =>
          a.org_unit_id === orgUnitId ? { ...a, role: newRole, is_primary: isPrimary } :
          isPrimary ? { ...a, is_primary: false } : a
        ));
        if (isPrimary) loadData();
      } else {
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch { showToast('Error updating assignment', 'error'); }
  };

  const handleAvatarUpload = async (file: File, type: 'user', id: string) => {
    setUploadingFor(id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('targetUsername', id);
      const res = await fetch('/api/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        showToast('Avatar updated!', 'success');
        setUsers(prev => prev.map(u => u.username === id ? { ...u, avatar: data.avatarPath } : u));
        if (editItem?.username === id) setEditItem((p: any) => ({ ...p, avatar: data.avatarPath }));
      } else showToast(data.error || 'Upload failed', 'error');
    } catch { showToast('Upload error', 'error'); }
    finally { setUploadingFor(null); }
  };

  const triggerUpload = (type: 'user', id: string) => { setPendingUploadTarget({ type, id }); fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadTarget) return;
    handleAvatarUpload(file, pendingUploadTarget.type, pendingUploadTarget.id);
    e.target.value = '';
  };

  const saveUser = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
      const data = await res.json();
      if (data.success) { showToast('User updated!', 'success'); setUsers(prev => prev.map(u => u.username === editItem.username ? { ...u, ...editItem } : u)); setEditItem(null); }
      else showToast(data.error || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.display_job_position?.toLowerCase().includes(search.toLowerCase()) || u.display_organization?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (employeeFilter === 'active') return u.is_active;
    if (employeeFilter === 'inactive') return !u.is_active;
    if (employeeFilter === 'admin') return u.role === 'admin';
    return true;
  });

  const handleAddEmployee = async () => {
    if (!addEmployeeForm.username || !addEmployeeForm.password || !addEmployeeForm.full_name) {
      showToast('Username, password, dan nama lengkap wajib diisi', 'error');
      return;
    }
    setAddEmployeeLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addEmployeeForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Karyawan berhasil ditambahkan!', 'success');
        setShowAddEmployee(false);
        setAddEmployeeForm({ username: '', password: '', full_name: '', email: '', phone: '', job_position: '', organization: '', employee_id: '', role: 'user' });
        loadData();
      } else {
        showToast(data.error || 'Gagal menambahkan karyawan', 'error');
      }
    } catch { showToast('Error saat menyimpan', 'error'); }
    finally { setAddEmployeeLoading(false); }
  };

  const activeCount = users.filter(e => e.is_active).length;
  const adminCount = users.filter(e => e.role === 'admin').length;
  const orgCount = new Set(users.map(e => e.display_organization).filter(Boolean)).size;
  const posCount = new Set(users.map(e => e.display_job_position).filter(Boolean)).size;
  const extraHeader = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
      <button onClick={() => setShowAddEmployee(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(99,102,241,0.3)', marginBottom: 1 }}>
        <Plus size={14} /> Tambah Karyawan
      </button>
    </div>
  );

  if (!authChecked) return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>;

  return (
    <>
      <AdminLayout extraHeader={extraHeader} activeTab="users">
        {loading ? (
          <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Employees', value: users.length, color: '#6366f1' },
                { label: 'Active', value: activeCount, color: '#10b981' },
                { label: 'Admins', value: adminCount, color: '#f59e0b' },
                { label: 'Organizations', value: orgCount, color: '#8b5cf6' },
                { label: 'Job Positions', value: posCount, color: '#3b82f6' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'DM Sans, sans-serif' }}>{s.value}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(59,130,246,0.06))',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>Sync Job Position & Organization</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2, fontFamily: 'DM Sans, sans-serif' }}>Auto-fill Job Position & Organization dari primary organizational assignment</div>
              </div>
              <button
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const res = await fetch('/api/admin/sync-primary-info', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) { showToast(`✅ ${data.message}`, 'success'); loadData(); }
                    else showToast(data.error || 'Sync failed', 'error');
                  } catch { showToast('Error syncing', 'error'); }
                  finally { setSyncing(false); }
                }}
                disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1, whiteSpace: 'nowrap' }}
              >
                {syncing ? <Loader2 size={13} className={styles.spin} /> : <RefreshCw size={13} />}
                {syncing ? 'Syncing...' : 'Sync Sekarang'}
              </button>
            </div>

            <div className={styles.tabs}>
              {(['all', 'active', 'inactive', 'admin'] as const).map(f => (
                <button key={f} className={`${styles.tab} ${employeeFilter === f ? styles.tabActive : ''}`} onClick={() => setEmployeeFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'all' && ` (${users.length})`}
                  {f === 'active' && ` (${activeCount})`}
                  {f === 'admin' && ` (${adminCount})`}
                </button>
              ))}
            </div>

            <div className={styles.grid}>
              {filteredUsers.map(u => (
                <div key={u.username} className={styles.card} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '16px', cursor: 'pointer' }} onClick={() => setSelectedEmployee(u)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <AvatarDisplay src={u.avatar} name={u.full_name || u.username} size={48} />
                      <button className={styles.avatarEditBtn} onClick={(e) => { e.stopPropagation(); triggerUpload('user', u.username); }} disabled={uploadingFor === u.username} title="Change avatar" style={{ position: 'absolute', bottom: -2, right: -2 }}>
                        {uploadingFor === u.username ? <Loader2 size={10} className={styles.spin} /> : <Camera size={10} />}
                      </button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {u.full_name || u.username}
                        {u.role === 'admin' && <Shield size={13} style={{ color: '#f59e0b' }} />}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>@{u.username}</div>
                    </div>
                    <span style={{ padding: '2px 8px', background: u.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: u.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  {u.display_job_position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                      <Tag size={13} style={{ color: '#7c3aed' }} /> {u.display_job_position}
                    </div>
                  )}
                  {u.display_organization && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                      <Building2 size={13} style={{ color: '#8b5cf6' }} /> {u.display_organization}
                    </div>
                  )}
                  {u.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                      <Mail size={12} /> {u.email}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button className={styles.editBtn} onClick={() => openUserOrgModal(u)} title="Manage Organizational Assignments" style={{ color: '#7c3aed', borderColor: 'rgba(124,58,237,0.3)', flex: 1 }}><Edit2 size={14} /></button>
                    <button className={styles.editBtn} onClick={() => setEditItem({ ...u })} style={{ flex: 1 }}><Edit2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminLayout>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {editItem && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setEditItem(null)}>
          <div className={styles.modal} style={{ width: 'min(620px,100%)', maxHeight: '90vh' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>✏️ Edit User: {editItem.full_name || editItem.username}</span>
              <button className={styles.modalClose} onClick={() => setEditItem(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalAvatarRow}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <AvatarDisplay src={editItem.avatar} name={editItem.full_name || editItem.username} size={72} />
                <button className={styles.avatarEditBtnLg} onClick={() => triggerUpload('user', editItem.username)} disabled={!!uploadingFor}>
                  {uploadingFor ? <Loader2 size={14} className={styles.spin} /> : <Camera size={14} />}
                </button>
              </div>
              <div>
                <div className={styles.modalAvatarName}>{editItem.full_name || editItem.username}</div>
                <div className={styles.modalAvatarSub}>@{editItem.username}</div>
              </div>
            </div>
            <div className={styles.modalFields}>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Full Name</label><input value={editItem.full_name || ''} onChange={e => setEditItem((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
                <div className={styles.field}><label>Email</label><input value={editItem.email || ''} onChange={e => setEditItem((p: any) => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Job Position</label>
                  <input value={editItem.display_job_position || editItem.job_position || ''} readOnly disabled style={{ background: '#F3F4F6', cursor: 'not-allowed', color: '#6B7280' }} title="Auto-filled from Primary Organizational Assignment" />
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>🔒 Auto-filled from Primary Assignment</div>
                </div>
                <div className={styles.field}>
                  <label>Organization</label>
                  <input value={editItem.display_organization || editItem.organization || activeWorkspace?.name || activeWorkspace?.workspace_name || 'Workspace'} readOnly disabled style={{ background: '#F3F4F6', cursor: 'not-allowed', color: '#6B7280' }} title="Auto-filled from Company Level" />
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>🔒 Auto-filled from Company Level</div>
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Phone</label><input value={editItem.phone || ''} onChange={e => setEditItem((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                <div className={styles.field}><label>Employee ID</label><input value={editItem.employee_id || ''} onChange={e => setEditItem((p: any) => ({ ...p, employee_id: e.target.value }))} /></div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Role Sistem</label><select value={editItem.role || 'user'} onChange={e => setEditItem((p: any) => ({ ...p, role: e.target.value }))}><option value="user">User</option><option value="admin">Admin</option></select></div>
                <div className={styles.field}><label>Status</label><select value={editItem.is_active ? '1' : '0'} onChange={e => setEditItem((p: any) => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}><option value="1">Active</option><option value="0">Inactive</option></select></div>
              </div>
              <div className={styles.field}><label>Password Baru (kosongkan jika tidak diubah)</label><input type="password" placeholder="••••••••" value={editItem.password || ''} onChange={e => setEditItem((p: any) => ({ ...p, password: e.target.value }))} /></div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditItem(null)}>Batal</button>
              <button className={styles.btnSave} onClick={saveUser} disabled={saving}>
                {saving ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserOrgModal && userOrgTarget && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowUserOrgModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 720 }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>🏢 Organizational Assignments: {userOrgTarget.full_name || userOrgTarget.username}</span>
              <button className={styles.modalClose} onClick={() => setShowUserOrgModal(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>
                Primary Job Position: <strong style={{ color: '#111827' }}>{userOrgTarget.display_job_position || userOrgTarget.job_position || '-'}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 16, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                Karyawan bisa di-assign ke multiple organizational units dengan role berbeda.
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                  Current Assignments ({userOrgAssignments.length})
                </div>
                {userOrgLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={24} className={styles.spin} style={{ color: '#7c3aed' }} /></div>
                ) : userOrgAssignments.length === 0 ? (
                  <div style={{ padding: 16, background: 'rgba(226,232,240,0.3)', border: '2px dashed rgba(226,232,240,0.7)', borderRadius: 10, textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                    Belum ada organizational assignment
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflow: 'auto' }}>
                    {userOrgAssignments.map((assignment: any) => (
                      <div key={assignment.id} style={{ background: `linear-gradient(135deg, ${assignment.color}08, ${assignment.color}15)`, border: `1.5px solid ${assignment.color}30`, borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${assignment.color}, ${assignment.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                              {assignment.unit_code.substring(0, 2)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                                {assignment.unit_name}
                                {assignment.is_primary && (
                                  <span style={{ padding: '2px 6px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>⭐ PRIMARY</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{assignment.unit_type} · Level {assignment.level}</div>
                            </div>
                          </div>
                          <button onClick={() => removeOrgAssignmentFromUser(assignment.org_unit_id)} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Remove</button>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>Role in this unit:</label>
                            <select value={assignment.role || 'staff'} onChange={(e) => updateOrgAssignmentRole(assignment.org_unit_id, e.target.value, assignment.is_primary)} style={{ width: '100%', padding: '6px 10px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, background: 'white', color: '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                              <option value="staff">👤 Staff</option>
                              <option value="support">🔧 Support</option>
                              <option value="leader">👑 Leader</option>
                              <option value="manager">🎯 Manager</option>
                              <option value="owner">🏆 Owner</option>
                              <option value="direktur">💼 Direktur</option>
                            </select>
                          </div>
                          <div style={{ minWidth: 100 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>Primary:</label>
                            <button onClick={() => updateOrgAssignmentRole(assignment.org_unit_id, assignment.role, !assignment.is_primary)} style={{ width: '100%', padding: '6px 10px', border: assignment.is_primary ? '2px solid #10b981' : '1px solid rgba(226,232,240,0.7)', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, background: assignment.is_primary ? 'rgba(16,185,129,0.1)' : 'white', color: assignment.is_primary ? '#059669' : '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase' }}>
                              {assignment.is_primary ? '⭐ YES' : '○ NO'}
                            </button>
                          </div>
                        </div>
                        {assignment.team_members && assignment.team_members.length > 0 && (
                          <div style={{ paddingTop: 10, borderTop: `1px solid ${assignment.color}20` }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Team Members ({assignment.team_count}):</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {assignment.team_members.slice(0, 5).map((member: any) => {
                                const isSupport = member.team_role === 'support';
                                const isLeader = member.team_role === 'leader' || member.team_role === 'manager' || member.team_role === 'owner' || member.team_role === 'direktur';
                                return (
                                  <div key={member.username} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: isSupport ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.7)', border: isSupport ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(226,232,240,0.5)', borderRadius: 6, fontSize: '0.7rem', color: isSupport ? '#3b82f6' : '#374151', fontFamily: 'DM Sans, sans-serif', fontWeight: isSupport ? 600 : 400 }} title={`${member.full_name} - ${member.team_role}`}>
                                    {isLeader ? '👑' : isSupport ? '🔧' : '👤'}
                                    {member.full_name.split(' ')[0]}
                                  </div>
                                );
                              })}
                              {assignment.team_count > 5 && (
                                <div style={{ padding: '3px 8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6, fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>+{assignment.team_count - 5} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(16,185,129,0.05))', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>➕ Add New Assignment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Organizational Unit:</label>
                    <select value={addingOrgUnit} onChange={e => setAddingOrgUnit(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                      <option value="">-- Pilih Organizational Unit --</option>
                      {orgUnits.filter(unit => !userOrgAssignments.find(a => a.org_unit_id === unit.id)).map(unit => (
                        <option key={unit.id} value={unit.id.toString()}>{'  '.repeat(unit.level)}{unit.unit_name} ({unit.unit_type})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Role:</label>
                      <select value={addingOrgRole} onChange={e => setAddingOrgRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                        <option value="staff">👤 Staff</option>
                        <option value="support">🔧 Support</option>
                        <option value="leader">👑 Leader</option>
                        <option value="manager">🎯 Manager</option>
                        <option value="owner">🏆 Owner</option>
                        <option value="direktur">💼 Direktur</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 120 }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Primary Assignment:</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        <input type="checkbox" checked={addingIsPrimary} onChange={e => setAddingIsPrimary(e.target.checked)} style={{ margin: 0 }} />
                        <span style={{ fontSize: '0.875rem', color: '#1F2937' }}>⭐ Primary</span>
                      </label>
                    </div>
                  </div>
                  <button onClick={addOrgAssignmentToUser} disabled={!addingOrgUnit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: !addingOrgUnit ? '#9CA3AF' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: !addingOrgUnit ? 'not-allowed' : 'pointer', boxShadow: !addingOrgUnit ? 'none' : '0 2px 6px rgba(16,185,129,0.25)' }}>
                    <Plus size={14} /> Add Assignment
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowUserOrgModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showAddEmployee && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddEmployee(false)}>
          <div className={styles.modal} style={{ width: 'min(580px,100%)' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>➕ Tambah Karyawan Baru</span>
              <button className={styles.modalClose} onClick={() => setShowAddEmployee(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Nama Lengkap *</label><input placeholder="Contoh: Budi Santoso" value={addEmployeeForm.full_name} onChange={e => setAddEmployeeForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div className={styles.field}><label>Username *</label><input placeholder="Contoh: budi" value={addEmployeeForm.username} onChange={e => setAddEmployeeForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} /></div>
              </div>
              <div className={styles.field}>
                <label>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Minimal 6 karakter" value={addEmployeeForm.password} onChange={e => setAddEmployeeForm(p => ({ ...p, password: e.target.value }))} style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', color: '#1F2937', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Email</label><input type="email" placeholder="budi@perusahaan.com" value={addEmployeeForm.email} onChange={e => setAddEmployeeForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className={styles.field}><label>No. Telepon</label><input placeholder="08xxxxxxxxxx" value={addEmployeeForm.phone} onChange={e => setAddEmployeeForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Primary Job Position</label><input placeholder="Contoh: Business Development" value={addEmployeeForm.job_position} onChange={e => setAddEmployeeForm(p => ({ ...p, job_position: e.target.value }))} /></div>
                <div className={styles.field}><label>Primary Organization</label><input placeholder="Contoh: Workspace Name" value={addEmployeeForm.organization} onChange={e => setAddEmployeeForm(p => ({ ...p, organization: e.target.value }))} /></div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}><label>Employee ID</label><input placeholder="Contoh: EMP-001" value={addEmployeeForm.employee_id} onChange={e => setAddEmployeeForm(p => ({ ...p, employee_id: e.target.value }))} /></div>
                <div className={styles.field}><label>System Role</label><select value={addEmployeeForm.role} onChange={e => setAddEmployeeForm(p => ({ ...p, role: e.target.value }))}><option value="user">User</option><option value="admin">Admin</option></select></div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => { setShowAddEmployee(false); setAddEmployeeForm({ username: '', password: '', full_name: '', email: '', phone: '', job_position: '', organization: '', employee_id: '', role: 'user' }); }}>Batal</button>
              <button className={styles.btnSave} onClick={handleAddEmployee} disabled={addEmployeeLoading} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                {addEmployeeLoading ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {addEmployeeLoading ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedEmployee(null)}>
          <div className={styles.modal} style={{ width: 'min(720px,100%)', maxHeight: '90vh', overflow: 'auto' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>👤 Employee Profile & Assignments</span>
              <button className={styles.modalClose} onClick={() => setSelectedEmployee(null)}>×</button>
            </div>
            <div className={styles.modalAvatarRow}>
              <AvatarDisplay src={selectedEmployee.avatar} name={selectedEmployee.full_name || selectedEmployee.username} size={72} />
              <div style={{ flex: 1 }}>
                <div className={styles.modalAvatarName}>{selectedEmployee.full_name || selectedEmployee.username}</div>
                <div className={styles.modalAvatarSub}>@{selectedEmployee.username} · {selectedEmployee.role}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '3px 8px', background: selectedEmployee.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: selectedEmployee.is_active ? '#059669' : '#dc2626', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedEmployee.is_active ? '● Active' : '○ Inactive'}
                  </span>
                  {selectedEmployee.role === 'admin' && (
                    <span style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>️ Admin</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>📋 Basic Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.5)' }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Employee ID</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.employee_id || '-'}</div>
                </div>
                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.5)' }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Email</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.email || '-'}</div>
                </div>
                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.5)' }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Phone</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.phone || '-'}</div>
                </div>
                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.5)' }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Joined Date</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>🏢 Primary Assignment</h3>
              <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>Job Position</div><div style={{ color: '#111827', fontWeight: 700, fontSize: '0.9375rem' }}>{selectedEmployee.display_job_position || selectedEmployee.job_position || '-'}</div></div>
                  <div><div style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>Organization</div><div style={{ color: '#111827', fontWeight: 700, fontSize: '0.9375rem' }}>{selectedEmployee.display_organization || selectedEmployee.organization || '-'}</div></div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>🎯 Organizational Unit Assignments</h3>
                <button onClick={() => { openUserOrgModal(selectedEmployee); setSelectedEmployee(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <Plus size={12} /> Manage Assignments
                </button>
              </div>
              <div style={{ background: '#F9FAFB', border: '2px dashed rgba(226,232,240,0.7)', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏗️</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>Multi-Role Assignment System</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
                  Klik &ldquo;Manage Assignments&rdquo; untuk assign ke multiple organizational units dengan role berbeda.
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setSelectedEmployee(null)}>Close</button>
              <button className={styles.btnSave} onClick={() => { setEditItem({ ...selectedEmployee }); setSelectedEmployee(null); }} style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Tag size={14} /> Edit Profile
              </button>
              <button className={styles.btnSave} onClick={() => { openUserOrgModal(selectedEmployee); setSelectedEmployee(null); }}>
                Manage Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
