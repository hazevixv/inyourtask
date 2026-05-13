'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Globe, Bot, FolderKanban, CheckSquare, Plus, Search, X,
  Activity, Database, LogOut, Settings, Bell, ChevronDown, Sparkles, Box, Loader2
} from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';
import { isPlatformSuperAdminUser } from '@/lib/workspace-permissions';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: Shield },
  { id: 'users',      label: 'Users',      icon: Users },
  { id: 'workspaces', label: 'Workspaces', icon: Globe },
  { id: 'agents',     label: 'AI Workers', icon: Bot },
  { id: 'activity',   label: 'Activity',   icon: Activity },
];

const TAB_SLUGS = new Set(NAV.map(item => item.id));
const TAB_PATHS: Record<string, string> = {
  dashboard: 'dashboard',
  users: 'users',
  workspaces: 'workspaces',
  agents: 'ai-workers',
  activity: 'activity',
};

function normalizeTabSlug(value?: string | null) {
  const raw = String(value || '').trim().toLowerCase();
  const compact = raw
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '');

  if (!compact) return 'dashboard';
  if (TAB_SLUGS.has(compact)) return compact;
  if (compact === 'aiagent' || compact === 'aiagents' || compact === 'ai-worker' || compact === 'aiworkers') return 'agents';
  return 'dashboard';
}

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isExplicitSuperAdmin(candidate?: any) {
  const normalized = [
    normalizeKey(candidate?.username),
    normalizeKey(candidate?.full_name),
  ].filter(Boolean);
  return normalized.includes('hazevixv-admin');
}

type SuperAdminPageProps = {
  initialTab?: string;
};

export default function SuperAdminPage({ initialTab }: SuperAdminPageProps = {}) {
  const router = useRouter();
  const { user, authChecked, handleLogout } = useApp();
  const [tab, setTab] = useState(() => normalizeTabSlug(initialTab));
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // AI Worker form
  const [showForm, setShowForm] = useState(false);
  const [aName, setAName] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aPrompt, setAPrompt] = useState('');
  const [aUser, setAUser] = useState('');
  const [aLoading, setALoading] = useState(false);

  // Enhanced AI Worker
  const [aBrief, setABrief] = useState('');
  const [aRole, setARole] = useState('');
  const [aKnowledgeBase, setAKnowledgeBase] = useState('');
  const [aAvatarPrompt, setAAvatarPrompt] = useState('');
  const [aModel, setAModel] = useState('openai/gpt-oss-20b');
  const [aAccessType, setAAccessType] = useState<'free' | 'subscription' | 'code'>('free');
  const [aPlanId, setAPlanId] = useState<number | ''>('');
  const [aCode, setACode] = useState('');
  const [aPublic, setAPublic] = useState(false);
  const [aMaxActivations, setAMaxActivations] = useState(-1);
  const [aEnhancing, setAEnhancing] = useState(false);
  const [aEnhancingField, setAEnhancingField] = useState<string | null>(null);
  const [aAvatarPreview, setAAvatarPreview] = useState<string | null>(null);
  const [aAvatarFile, setAAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [deployAgentId, setDeployAgentId] = useState('');
  const [deployAccessType, setDeployAccessType] = useState<'free' | 'subscription' | 'code'>('free');
  const [deployUserIds, setDeployUserIds] = useState<string[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeWorkers, setActiveWorkers] = useState<any[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [editWorkerForm, setEditWorkerForm] = useState<any>(null);

  // Bulk operations
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (aAccessType === 'free') {
      if (aPlanId !== '') setAPlanId('');
      if (aCode) setACode('');
    } else if (aAccessType === 'subscription') {
      if (aCode) setACode('');
    } else if (aAccessType === 'code') {
      if (aPlanId !== '') setAPlanId('');
    }
  }, [aAccessType, aPlanId, aCode]);

  const normalizeAgent = (agent: any) => ({
    ...agent,
    is_personal: Number(agent?.is_personal) === 1,
    is_active: Number(agent?.is_active) === 1,
    is_public: Number(agent?.is_public) === 1,
  });

  const getAccessTypeMeta = (agentOrType: any, isPublic?: boolean, planName?: string | null) => {
    const accessType = typeof agentOrType === 'string' ? agentOrType : String(agentOrType?.access_type || 'free');
    const publicFlag = typeof agentOrType === 'object' ? Number(agentOrType?.is_public) === 1 : !!isPublic;
    const normalizedType = accessType === 'subscription' ? 'subscription' : accessType === 'code' ? 'code' : 'free';
    const visibility = publicFlag ? 'Public' : 'Restricted';
    const accessText = normalizedType === 'subscription'
      ? `Subscription${planName ? ` · ${planName}` : ''}`
      : normalizedType === 'code'
        ? 'Code-Based'
        : 'Free';
    const color = normalizedType === 'subscription' ? '#d97706' : normalizedType === 'code' ? '#6366f1' : '#059669';
    return { accessText, visibility, color };
  };

  const toggleSelectWorker = (id: string) => {
    setSelectedWorkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAllWorkers = (filtered: any[]) => {
    if (selectedWorkerIds.length === filtered.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(filtered.map((a: any) => a.agent_id));
    }
  };
  const runBulkAction = async (action: string, value?: any) => {
    if (selectedWorkerIds.length === 0) return;
    if (!confirm(`Jalankan "${action}" pada ${selectedWorkerIds.length} worker?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/super-admin/agents/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action, agent_ids: selectedWorkerIds, value }),
      });
      const d = await res.json();
      if (d.success) { st(`Bulk ${action}: ${d.data?.affected || d.data?.deleted || d.data?.assignments_created || 'OK'} affected`); setSelectedWorkerIds([]); load(); }
      else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setBulkLoading(false); }
  };

  const st = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes, aRes, pRes, asRes] = await Promise.all([
        fetch('/api/super-admin/overview', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/super-admin/users', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/super-admin/agents?include_personal=1', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/super-admin/subscription-plans', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/super-admin/agent-assignments', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (oRes.ok) { const o = await oRes.json(); if (o.success) setData(o.data); }
      if (uRes.ok) { const u = await uRes.json(); if (u.success) setUsers(u.data || []); }
      if (aRes.ok) { const a = await aRes.json(); if (a.success) setAgents((a.data || []).map(normalizeAgent)); }
      if (pRes.ok) { const pl = await pRes.json(); if (pl.success) setSubscriptionPlans(pl.data || []); }
      if (asRes.ok) { const as = await asRes.json(); if (as.success) setAssignments(as.data || []); }
    } catch (e: any) { st(e.message, 'error'); }
    finally { setLoading(false); }
  }, [st]);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.replace('/login'); return; }
    if (!isPlatformSuperAdminUser(user as any) && !isExplicitSuperAdmin(user)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setAccessDenied(false);
    load();
  }, [authChecked, load, router, user]);

  useEffect(() => {
    setTab(normalizeTabSlug(initialTab));
  }, [initialTab]);

  const goToTab = (nextTab: string) => {
    const tabId = normalizeTabSlug(nextTab);
    setTab(tabId);
    router.push(`/super-admin/${TAB_PATHS[tabId] || 'dashboard'}`);
  };

  const autoFillAgent = async () => {
    if (!aBrief || aBrief.trim().length < 5) { st('Isi brief dulu (min 5 karakter)', 'error'); return; }
    setAEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action: 'autofill', brief: aBrief }),
      });
      const d = await res.json();
      if (d.success && d.result) {
        if (d.result.name) setAName(d.result.name);
        if (d.result.description) setADesc(d.result.description);
        if (d.result.role) setARole(d.result.role);
        if (d.result.system_prompt) setAPrompt(d.result.system_prompt);
        if (d.result.knowledge_base) setAKnowledgeBase(d.result.knowledge_base);
        if (d.result.avatar_prompt) setAAvatarPrompt(d.result.avatar_prompt);
        if (d.result.model) setAModel(d.result.model);
        st('Semua field terisi dari AI!', 'success');
      } else st(d.error || 'Gagal auto-fill', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setAEnhancing(false); }
  };

  const enhanceField = async (field: string) => {
    const valueMap: Record<string, string> = {
      name: aName, description: aDesc, role: aRole,
      system_prompt: aPrompt, knowledge_base: aKnowledgeBase,
    };
    const setterMap: Record<string, (v: string) => void> = {
      name: setAName, description: setADesc, role: setARole,
      system_prompt: setAPrompt, knowledge_base: setAKnowledgeBase,
    };
    setAEnhancingField(field);
    try {
      const res = await fetch('/api/ai/enhance-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action: 'enhance', field, value: valueMap[field] || '', brief: aBrief }),
      });
      const d = await res.json();
      if (d.success && d.result) {
        setterMap[field]?.(d.result);
        st(`${field} di-enhance!`, 'success');
      } else st(d.error || 'Gagal enhance', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setAEnhancingField(null); }
  };

  const createAgent = async () => {
    if (!aName.trim()) return;
    setALoading(true);
    try {
      const normalizedPlanId = aAccessType === 'subscription' ? (aPlanId || null) : null;
      const normalizedCode = aAccessType === 'code' ? aCode.trim() : null;
      const res = await fetch('/api/super-admin/agents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          name: aName.trim(),
          description: aDesc.trim(),
          role: aRole.trim() || null,
          system_prompt: aPrompt.trim(),
          knowledge_base: aKnowledgeBase.trim() || null,
          model: aModel,
          access_type: aAccessType,
          subscription_plan_id: aPlanId || null,
          agent_code: aCode.trim() || null,
          is_public: aPublic,
          max_activations: aMaxActivations,
          avatar_prompt: aAvatarPrompt.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        // Upload avatar if selected
        if (aAvatarFile && d.data?.agent_id) {
          const fd = new FormData();
          fd.append('file', aAvatarFile);
          fd.append('agentId', d.data.agent_id);
          await fetch('/api/avatar', { method: 'POST', body: fd }).catch(() => {});
        }
        st('AI Worker created!');
        setShowForm(false);
        setAName(''); setADesc(''); setAPrompt(''); setACode(''); setARole(''); setAKnowledgeBase(''); setAAvatarPrompt('');
        setAModel('openai/gpt-oss-20b');
        setAAccessType('free'); setAPlanId(''); setAPublic(false); setAMaxActivations(-1);
        setABrief(''); setAAvatarPreview(null); setAAvatarFile(null);
        load();
      } else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setALoading(false); }
  };

  const deployAgentToUsers = async () => {
    if (!deployAgentId || deployUserIds.length === 0) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/super-admin/agent-assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ agent_id: deployAgentId, usernames: deployUserIds, access_type: deployAccessType }),
      });
      const d = await res.json();
      if (d.success) {
        st(`Deployed to ${d.data.assigned}/${d.data.total} users!`);
        setShowDeployPanel(false);
        setDeployUserIds([]);
        load();
      } else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setDeploying(false); }
  };

  const saveWorkerEdit = async () => {
    if (!editingWorker) return;
    setALoading(true);
    try {
      const normalizedPlanId = aAccessType === 'subscription' ? (aPlanId || null) : null;
      const normalizedCode = aAccessType === 'code' ? aCode.trim() : null;
      const res = await fetch('/api/super-admin/agents', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          agent_id: editingWorker.agent_id,
          name: aName,
          description: aDesc,
          system_prompt: aPrompt,
          access_type: aAccessType,
          subscription_plan_id: normalizedPlanId,
          is_public: aPublic ? 1 : 0,
          agent_code: aCode || null,
          max_activations: aMaxActivations,
          avatar_prompt: aAvatarPrompt || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        st('Worker updated!');
        setShowForm(false); setEditingWorker(null);
        setAName(''); setADesc(''); setAPrompt(''); setACode(''); setARole(''); setAKnowledgeBase(''); setAAvatarPrompt('');
        setAModel('openai/gpt-oss-20b');
        setAAccessType('free'); setAPlanId(''); setAPublic(false); setAMaxActivations(-1);
        load();
      } else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
    finally { setALoading(false); }
  };

  const deleteWorker = async (agentId: string) => {
    if (!confirm('Hapus Worker AI ini? Semua assignment akan dihapus.')) return;
    try {
      const res = await fetch(`/api/super-admin/agents?agent_id=${encodeURIComponent(agentId)}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (d.success) { st('Worker deleted!'); load(); }
      else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
  };

  const removeAssignment = async (agentId: string, username: string) => {
    try {
      const res = await fetch(`/api/super-admin/agent-assignments?agent_id=${encodeURIComponent(agentId)}&username=${encodeURIComponent(username)}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (d.success) { st('Assignment removed'); load(); }
      else st(d.error || 'Failed', 'error');
    } catch (e: any) { st(e.message, 'error'); }
  };

  if (!authChecked) return <PageLoader />;
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ maxWidth: 560, padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c4b5fd', marginBottom: 10 }}>Super Admin Access</div>
          <h1 style={{ margin: '0 0 10px', fontSize: 28, lineHeight: 1.1 }}>Akses superadmin belum dikenali</h1>
          <p style={{ margin: 0, color: 'rgba(226,232,240,0.86)', lineHeight: 1.7 }}>
            Akun ini seharusnya bisa masuk ke halaman super admin. Jika kamu baru mengubah env, restart dev server dulu. Saat ini akun kamu akan dicocokkan sebagai <strong>hazevixv-admin</strong> atau daftar superadmin di environment.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u: any) => !search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.full_name || '').toLowerCase().includes(search.toLowerCase()));
  const selectedGrantWorker = agents.find((a: any) => a.agent_id === deployAgentId);
  const publicWorkerCount = agents.filter((a: any) => a.is_public && !a.is_personal).length;
  const restrictedWorkerCount = agents.filter((a: any) => !a.is_personal && !a.is_public).length;
  const bulkBtnStyle: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' };

  const CountCard = ({ label, value, icon: Icon, color }: any) => (
    <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(226,232,240,0.6)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: color || '#3d6ba3', display: 'flex' }}><Icon size={18} /></span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{value ?? 0}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 55% at 10% -8%, rgba(132,187,254,0.20) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 105%, rgba(170,199,215,0.25) 0%, transparent 50%), radial-gradient(ellipse 60% 65% at 50% 50%, rgba(223,235,246,0.30) 0%, transparent 65%), linear-gradient(160deg, #f8f0ed 0%, #dfe2e7 30%, #cbdce7 65%, #dfebf6 100%)', display: 'flex', flexDirection: 'column' }}>
      
      {/* ═══ TOP NAV BAR ═══ */}
      <header style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(226,232,240,0.6)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1a365d, #3d6ba3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>S</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>Command Center</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', background: 'rgba(226,232,240,0.6)', padding: '2px 7px', borderRadius: 4 }}>superadmin</span>
          </div>

          {/* Center: nav */}
          <nav style={{ display: 'flex', gap: 2 }}>
            {NAV.map(n => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button key={n.id} onClick={() => goToTab(n.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 7,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: active ? 'rgba(61,107,163,0.1)' : 'transparent',
                  color: active ? '#3d6ba3' : '#64748b', transition: 'all 140ms ease',
                }}>
                  <Icon size={15} /> {n.label}
                </button>
              );
            })}
          </nav>

          {/* Right: user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{user?.full_name || user?.username}</span>
            <button onClick={handleLogout} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(226,232,240,0.7)', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading platform data...</div>
        ) : !data ? (
          <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Unable to load data. Ensure you have superadmin access.</div>
        ) : (
          <>
            {/* ═══ DASHBOARD ═══ */}
            {tab === 'dashboard' && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>Platform Overview</h1>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Real-time snapshot of the entire platform.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
                  <CountCard label="Total Users"       value={data.counts?.users}               icon={Users} color="#3d6ba3" />
                  <CountCard label="Workspaces"        value={data.counts?.workspaces}           icon={Globe} color="#059669" />
                  <CountCard label="Members"           value={data.counts?.workspaceMembers}     icon={Users} color="#059669" />
                  <CountCard label="Projects"          value={data.counts?.projects}             icon={FolderKanban} color="#3b82f6" />
                  <CountCard label="Tasks"             value={data.counts?.tasks}                icon={CheckSquare} color="#f59e0b" />
                  <CountCard label="Workers"            value={data.counts?.workerAgents}         icon={Bot} color="#8b5cf6" />
                  <CountCard label="Personal AI"       value={data.counts?.personalAgents}       icon={Bot} color="#7c3aed" />
                  <CountCard label="Chat Conversations" value={data.counts?.conversations}        icon={Activity} color="#06b6d4" />
                  <CountCard label="Org Units"         value={data.counts?.organizationalUnits}  icon={Box} color="#f97316" />
                </div>

                {/* Recent Users Table */}
                <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Recently Joined Users</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Latest {Math.min(data.recentUsers?.length || 0, 8)} of {data.counts?.users || 0}</span>
                  </div>
                  {(data.recentUsers || []).slice(0, 8).map((r: any, i: number) => (
                    <div key={r.username} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 0.7fr', gap: 12, padding: '11px 18px', borderBottom: i < 7 ? '1px solid rgba(226,232,240,0.35)' : 'none', fontSize: 12, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.full_name || r.username}</span>
                      <span style={{ color: '#64748b' }}>@{r.username}</span>
                      <span style={{ color: '#64748b' }}>{r.role || 'user'}</span>
                      <span style={{ color: '#64748b' }}>{r.organization || '-'}</span>
                      <span style={{ color: r.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'right' }}>{r.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>

                {/* Workspaces Table */}
                {data.workspaces?.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>All Workspaces</span>
                    </div>
                    {data.workspaces.map((ws: any, i: number) => (
                      <div key={ws.workspace_id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 0.7fr 0.7fr 0.7fr', gap: 12, padding: '11px 18px', borderBottom: i < data.workspaces.length - 1 ? '1px solid rgba(226,232,240,0.35)' : 'none', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{ws.name}</span>
                        <span style={{ color: '#64748b' }}>{ws.type}</span>
                        <span style={{ color: '#64748b' }}>@{ws.owner_username || '-'}</span>
                        <span style={{ color: '#64748b', textAlign: 'center' }}>{ws.member_count} members</span>
                        <span style={{ color: '#64748b', textAlign: 'center' }}>{ws.project_count} projects</span>
                        <span style={{ color: ws.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'right' }}>{ws.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ═══ USERS ═══ */}
            {tab === 'users' && (
              <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>All Users ({users.length})</span>
                  <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or username..." style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 7, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, outline: 'none', background: '#fff' }} />
                    {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}><X size={13} /></button>}
                  </div>
                </div>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: 50, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users match your search.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 0 }}>
                    {filteredUsers.map((u: any, i: number) => (
                      <div key={u.username} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 0.7fr', gap: 12, padding: '11px 18px', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(226,232,240,0.35)' : 'none', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{u.full_name || u.username}</span>
                        <span style={{ color: '#64748b' }}>@{u.username}</span>
                        <span style={{ color: '#64748b' }}>{u.email || '-'}</span>
                        <span style={{ color: '#64748b' }}>{u.role || 'user'}</span>
                        <span style={{ color: u.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'right' }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ WORKSPACES ═══ */}
            {tab === 'workspaces' && (
              <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>All Workspaces ({data.workspaces?.length || 0})</span>
                </div>
                {!data.workspaces?.length ? (
                  <div style={{ padding: 50, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No workspaces created yet.</div>
                ) : (
                  data.workspaces.map((ws: any, i: number) => (
                    <div key={ws.workspace_id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 0.7fr 0.7fr 0.7fr', gap: 12, padding: '11px 18px', borderBottom: i < data.workspaces.length - 1 ? '1px solid rgba(226,232,240,0.35)' : 'none', fontSize: 12, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{ws.name}</span>
                      <span style={{ color: '#64748b' }}>{ws.type}</span>
                      <span style={{ color: '#64748b' }}>@{ws.owner_username || '-'}</span>
                      <span style={{ color: '#64748b', textAlign: 'center' }}>{ws.member_count}</span>
                      <span style={{ color: '#64748b', textAlign: 'center' }}>{ws.project_count}</span>
                      <span style={{ color: ws.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'right' }}>{ws.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══ AI WORKERS ═══ */}
            {tab === 'agents' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>AI Workers</h2>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Buat Worker AI. Mode <strong>Public</strong> langsung tersedia untuk semua user, sementara akses tambahan dipakai hanya untuk worker yang dibatasi.
                    </p>
                  </div>
                  <button onClick={() => { setShowForm(true); setEditingWorker(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', borderRadius: 8, background: '#3d6ba3', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(61,107,163,0.25)' }}>
                    <Plus size={15} /> Create Worker
                  </button>
                </div>

                {/* Create/Edit Form */}
                {showForm && (
                  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      {editingWorker ? 'Edit Worker AI' : 'Create Worker AI'}
                      {!editingWorker && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>Gunakan AI Auto-Fill untuk isi otomatis</span>
                      )}
                    </div>

                    {/* Avatar Upload */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(226,232,240,0.6)' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>
                        {aAvatarPreview ? (
                          <img src={aAvatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : aName ? (
                          aName.charAt(0).toUpperCase()
                        ) : (
                          <Bot size={22} />
                        )}
                      </div>
                      <div>
                        <button onClick={() => avatarInputRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(226,232,240,0.8)', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          {aAvatarPreview ? 'Ganti Avatar' : 'Upload Avatar'}
                        </button>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Ukuran kotak, max 2MB</div>
                      </div>
                      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAAvatarFile(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => setAAvatarPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                        e.target.value = '';
                      }} />
                      {aAvatarPreview && (
                        <button onClick={() => { setAAvatarPreview(null); setAAvatarFile(null); }} style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 11 }}>✕ Hapus</button>
                      )}
                    </div>

                    {/* AI Brief + Auto-Fill */}
                    {!editingWorker && (
                      <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Sparkles size={14} color="#6366f1" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>AI Auto-Fill</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Tulis brief, AI akan generate semua field</span>
                        </div>
                        <textarea placeholder="Contoh: AI Worker yang membantu tim marketing membuat konten social media, menjadwalkan posting, dan menganalisis engagement. Spesialisasi di Instagram dan TikTok." value={aBrief} onChange={e => setABrief(e.target.value)} rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                        <button onClick={autoFillAgent} disabled={aEnhancing || !aBrief.trim()} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: (aEnhancing || !aBrief.trim()) ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: (aEnhancing || !aBrief.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          {aEnhancing ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={13} />}
                          {aEnhancing ? 'AI Memproses...' : '✨ Auto-Fill All Fields'}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 12 }}>
                      {/* Name + Role row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Nama Worker *</span>
                            <button onClick={() => enhanceField('name')} disabled={aEnhancingField !== null} title="AI Enhance" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex' }}>
                              {aEnhancingField === 'name' ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                            </button>
                          </div>
                          <input placeholder="Contoh: Marketing AI Assistant" value={aName} onChange={e => setAName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Role / Spesialisasi</span>
                            <button onClick={() => enhanceField('role')} disabled={aEnhancingField !== null} title="AI Enhance" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex' }}>
                              {aEnhancingField === 'role' ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                            </button>
                          </div>
                          <input placeholder="Contoh: Marketing Spesialis" value={aRole} onChange={e => setARole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      {/* Description + Model row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Deskripsi</span>
                            <button onClick={() => enhanceField('description')} disabled={aEnhancingField !== null} title="AI Enhance" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex' }}>
                              {aEnhancingField === 'description' ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                            </button>
                          </div>
                          <input placeholder="Deskripsi singkat tentang AI Worker ini" value={aDesc} onChange={e => setADesc(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Model</span>
                          <select value={aModel} onChange={e => setAModel(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, background: '#fff' }}>
                            <option value="openai/gpt-oss-20b">GPT-OSS 20B</option>
                            <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
                            <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                            <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                          </select>
                        </div>
                      </div>

                      {/* System Prompt */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>System Prompt *</span>
                          <button onClick={() => enhanceField('system_prompt')} disabled={aEnhancingField !== null} title="AI Enhance" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex' }}>
                            {aEnhancingField === 'system_prompt' ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                          </button>
                        </div>
                        <textarea placeholder="Instruksi utama untuk AI Worker ini..." value={aPrompt} onChange={e => setAPrompt(e.target.value)} rows={5} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>

                      {/* Knowledge Base */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Knowledge Base</span>
                          <button onClick={() => enhanceField('knowledge_base')} disabled={aEnhancingField !== null} title="AI Enhance" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex' }}>
                            {aEnhancingField === 'knowledge_base' ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                          </button>
                        </div>
                        <textarea placeholder="Pengetahuan khusus yang harus dikuasai AI Worker (opsional)" value={aKnowledgeBase} onChange={e => setAKnowledgeBase(e.target.value)} rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>

                      {/* Avatar Prompt */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Prompt Avatar</span>
                          <Sparkles size={12} color="#94a3b8" />
                        </div>
                        <textarea placeholder="Deskripsi untuk generate avatar: 'A futuristic robot with green eyes, digital art style'" value={aAvatarPrompt} onChange={e => setAAvatarPrompt(e.target.value)} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      </div>

                      {/* Access Type row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Access Type</span>
                          <select value={aAccessType} onChange={e => setAAccessType(e.target.value as any)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, background: '#fff' }}>
                            <option value="free">Free</option>
                            <option value="subscription">Subscription</option>
                            <option value="code">Code-Based</option>
                          </select>
                          <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>
                            <strong style={{ color: '#64748b' }}>Free</strong> = langsung dipakai user. <strong style={{ color: '#64748b' }}>Subscription</strong> = butuh plan aktif. <strong style={{ color: '#64748b' }}>Code-Based</strong> = butuh kode aktivasi.
                          </div>
                        </div>
                        {aAccessType === 'subscription' && (
                          <div style={{ display: 'grid', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Plan</span>
                            <select value={aPlanId} onChange={e => setAPlanId(e.target.value ? Number(e.target.value) : '')} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, background: '#fff' }}>
                              <option value="">-- Pilih Plan --</option>
                              {subscriptionPlans.filter((p: any) => p.is_active).map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {aAccessType === 'code' && (
                          <div style={{ display: 'grid', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Kode Aktivasi</span>
                            <input placeholder="Kode untuk aktivasi" value={aCode} onChange={e => setACode(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, outline: 'none' }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visibility & Limits */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(226,232,240,0.6)', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                        <input type="checkbox" checked={aPublic} onChange={e => setAPublic(e.target.checked)} />
                        Public (visible to all users)
                      </label>
                      <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>
                        <strong style={{ color: '#64748b' }}>Public</strong> mengatur apakah worker tampil di Brain/Chat. Access Type mengatur cara user memakainya.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Max Activations:</span>
                        <input type="number" value={aMaxActivations} onChange={e => setAMaxActivations(parseInt(e.target.value) || -1)} style={{ width: 72, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12 }} />
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>(-1 = unlimited)</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                      <button onClick={() => {
                        setShowForm(false); setEditingWorker(null); setAName(''); setADesc(''); setAPrompt('');
                        setARole(''); setAKnowledgeBase(''); setAAvatarPrompt(''); setAModel('openai/gpt-oss-20b');
                        setAAccessType('free'); setAPlanId(''); setAPublic(false); setAMaxActivations(-1); setACode('');
                        setABrief(''); setAAvatarPreview(null); setAAvatarFile(null);
                      }} style={{ padding: '8px 16px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 8, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      {editingWorker ? (
                        <button onClick={saveWorkerEdit} disabled={aLoading || !aName} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: (aLoading || !aName) ? '#94a3b8' : '#d97706', color: '#fff', fontSize: 12, fontWeight: 600, cursor: (aLoading || !aName) ? 'not-allowed' : 'pointer' }}>
                          {aLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      ) : (
                        <button onClick={createAgent} disabled={aLoading || !aName} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: (aLoading || !aName) ? '#94a3b8' : '#3d6ba3', color: '#fff', fontSize: 12, fontWeight: 600, cursor: (aLoading || !aName) ? 'not-allowed' : 'pointer' }}>
                          {aLoading ? 'Creating...' : 'Create Worker'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Bulk Action Toolbar */}
                {selectedWorkerIds.length > 0 && (
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{selectedWorkerIds.length} selected</span>
                    <button onClick={() => runBulkAction('set_public', true)} disabled={bulkLoading} style={bulkBtnStyle}>Make Public</button>
                    <button onClick={() => runBulkAction('set_public', false)} disabled={bulkLoading} style={bulkBtnStyle}>Make Private</button>
                    <button onClick={() => runBulkAction('set_active', true)} disabled={bulkLoading} style={bulkBtnStyle}>Activate</button>
                    <button onClick={() => runBulkAction('set_active', false)} disabled={bulkLoading} style={bulkBtnStyle}>Deactivate</button>
                    <button onClick={() => {
                      const at = prompt('Set access type untuk semua terpilih (free/subscription/code):');
                      if (at && ['free', 'subscription', 'code'].includes(at)) runBulkAction('set_access_type', at);
                    }} disabled={bulkLoading} style={bulkBtnStyle}>Set Access</button>
                    <button onClick={() => runBulkAction('bulk_delete')} disabled={bulkLoading}
                      style={{ ...bulkBtnStyle, background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' }}>
                      {bulkLoading ? '...' : 'Delete'}
                    </button>
                    <button onClick={() => setSelectedWorkerIds([])} style={{ marginLeft: 'auto', padding: '5px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>Clear</button>
                  </div>
                )}

                {/* Workers List */}
                <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={selectedWorkerIds.length > 0 && selectedWorkerIds.length === agents.filter((a: any) => !a.is_personal).length}
                        onChange={() => {
                          const all = agents.filter((a: any) => !a.is_personal);
                          selectAllWorkers(all);
                        }} style={{ cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Workers ({agents.filter((a: any) => !a.is_personal).length})</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {publicWorkerCount} public · {restrictedWorkerCount} restricted
                      </span>
                    </div>
                    <div style={{ position: 'relative', maxWidth: 200 }}>
                      <input value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} placeholder="Cari worker..." style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(226,232,240,0.7)', fontSize: 11, outline: 'none' }} />
                    </div>
                  </div>
                  {agents.filter((a: any) => !a.is_personal && (!workerSearch || a.name?.toLowerCase().includes(workerSearch.toLowerCase()))).length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      <Bot size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                      <p>No AI Workers yet.</p>
                    </div>
                  ) : (
                    (() => {
                      const filteredWorkers = agents.filter((a: any) => !a.is_personal && (!workerSearch || a.name?.toLowerCase().includes(workerSearch.toLowerCase())));
                      return filteredWorkers.map((a: any, i: number) => {
                        const assignedCount = assignments.filter((as: any) => as.agent_id === a.agent_id).length;
                        const reachMode = a.is_public
                          ? '🌍 Public'
                          : a.role_count > 0
                            ? `👥 ${a.role_count} roles`
                            : assignedCount > 0
                              ? `👤 ${assignedCount} users`
                              : '🔒 Restricted';
                        const reachColor = a.is_public ? '#059669' : a.role_count > 0 ? '#7c3aed' : assignedCount > 0 ? '#3b82f6' : '#94a3b8';
                        return (
                          <div key={a.agent_id} style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1fr 1.5fr 1.2fr 0.8fr', gap: 8, padding: '9px 18px', borderBottom: i < filteredWorkers.length - 1 ? '1px solid rgba(226,232,240,0.3)' : 'none', fontSize: 12, alignItems: 'center' }}>
                            <input type="checkbox" checked={selectedWorkerIds.includes(a.agent_id)} onChange={() => toggleSelectWorker(a.agent_id)} style={{ cursor: 'pointer' }} />
                            <div>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.name}</span>
                              {a.access_type && (() => {
                                const accessMeta = getAccessTypeMeta(a, a.is_public, a.plan_name);
                                return (
                                  <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                    background: a.access_type === 'free' ? 'rgba(16,185,129,0.1)' : a.access_type === 'subscription' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                    color: accessMeta.color
                                  }}>
                                    {accessMeta.accessText}
                                  </span>
                                );
                              })()}
                            </div>
                            <span style={{ color: '#64748b' }}>{a.model?.split('/').pop() || '-'}</span>
                            <span style={{ color: reachColor, fontWeight: 600, fontSize: 11 }}>{reachMode}</span>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              {!a.is_public && (
                                <button onClick={() => {
                                  setDeployAgentId(a.agent_id);
                                  setDeployUserIds([]);
                                  setShowDeployPanel(true);
                                }} style={{ padding: '4px 8px', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 5, background: 'rgba(59,130,246,0.05)', color: '#3b82f6', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                                  Grant Access
                                </button>
                              )}
                              <button onClick={() => {
                                setAName(a.name); setADesc(a.description || ''); setAPrompt(a.system_prompt || '');
                                setARole(a.role || ''); setAKnowledgeBase(a.knowledge_base || ''); setAAvatarPrompt(a.avatar_prompt || '');
                                setAAccessType(a.access_type || 'free'); setAPlanId(a.subscription_plan_id || '');
                                setAPublic(!!a.is_public); setAMaxActivations(a.max_activations ?? -1); setACode(a.agent_code || '');
                                setAModel(a.model || 'openai/gpt-oss-20b');
                                setEditingWorker(a);
                                setEditWorkerForm({ agent_id: a.agent_id, name: a.name, description: a.description, system_prompt: a.system_prompt, model: a.model, access_type: a.access_type, is_public: a.is_public ? 1 : 0, is_active: a.is_active ? 1 : 0 });
                                setShowForm(true);
                              }} style={{ padding: '4px 8px', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5, background: 'rgba(245,158,11,0.05)', color: '#d97706', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                                Edit
                              </button>
                            </div>
                            <span style={{ color: a.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              {a.is_active ? 'Active' : 'Inactive'}
                              <button onClick={() => deleteWorker(a.agent_id)} style={{ padding: '2px 6px', border: 'none', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#dc2626', cursor: 'pointer', fontSize: 10 }} title="Hapus">✕</button>
                            </span>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>

                {/* Access Grants Panel */}
                {showDeployPanel && selectedGrantWorker && !selectedGrantWorker.is_public && (
                  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                      Access Grants: {selectedGrantWorker?.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
                      Worker ini <strong>restricted</strong>, jadi kamu perlu memberi akses ke user tertentu supaya bisa muncul di Brain dan Chat.
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pilih user yang akan diberi akses</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        <button onClick={() => setDeployUserIds(users.map((u: any) => u.username))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: 'transparent', fontSize: 11, cursor: 'pointer', color: '#3b82f6' }}>Select All</button>
                        <button onClick={() => setDeployUserIds([])} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(226,232,240,0.7)', background: 'transparent', fontSize: 11, cursor: 'pointer', color: '#64748b' }}>Clear</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid rgba(226,232,240,0.6)', borderRadius: 8, padding: 4, marginBottom: 12 }}>
                      {users.map((u: any) => (
                        <label key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                          <input type="checkbox" checked={deployUserIds.includes(u.username)} onChange={e => {
                            if (e.target.checked) setDeployUserIds(prev => [...prev, u.username]);
                            else setDeployUserIds(prev => prev.filter(id => id !== u.username));
                          }} />
                          <span>{u.full_name || u.username}</span>
                          <span style={{ color: '#94a3b8' }}>@{u.username}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Access Type:</span>
                      <select value={deployAccessType} onChange={e => setDeployAccessType(e.target.value as any)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(226,232,240,0.7)', fontSize: 12 }}>
                        <option value="free">Free</option>
                        <option value="subscription">Subscription</option>
                        <option value="code">Code</option>
                      </select>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{deployUserIds.length} user(s) selected</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowDeployPanel(false)} style={{ padding: '8px 16px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 8, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={deployAgentToUsers} disabled={deploying || deployUserIds.length === 0} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: (deploying || deployUserIds.length === 0) ? '#94a3b8' : '#059669', color: '#fff', fontSize: 12, fontWeight: 600, cursor: (deploying || deployUserIds.length === 0) ? 'not-allowed' : 'pointer' }}>
                        {deploying ? 'Saving...' : `Grant access to ${deployUserIds.length} user(s)`}
                      </button>
                    </div>
                  </div>
                )}

                {selectedGrantWorker && !selectedGrantWorker.is_public ? (
                  <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Access Grants ({assignments.filter((as: any) => as.agent_id === deployAgentId).length})</span>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                        Ini hanya untuk worker yang dibatasi. Public worker tidak memerlukan grant untuk tampil.
                      </div>
                    </div>
                    {assignments.filter((as: any) => as.agent_id === deployAgentId).length === 0 ? (
                      <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No access grants yet.</div>
                    ) : (
                      assignments.filter((as: any) => as.agent_id === deployAgentId).map((as: any, i: number, list: any[]) => (
                        <div key={as.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 0.8fr 0.8fr 0.6fr', gap: 12, padding: '9px 18px', borderBottom: i < list.length - 1 ? '1px solid rgba(226,232,240,0.3)' : 'none', fontSize: 11, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{as.agent_name}</span>
                          <span style={{ color: '#64748b' }}>{as.user_name || as.username} @{as.username}</span>
                          <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{as.access_type}</span>
                          <span style={{ color: as.is_approved ? '#059669' : '#d97706', fontWeight: 600 }}>{as.is_approved ? 'Approved' : 'Pending'}</span>
                          <button onClick={() => removeAssignment(as.agent_id, as.username)} style={{ padding: '3px 8px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 10 }} title="Remove">Revoke</button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {/* ═══ USER AI AGENTS SECTION ═══ */}
                <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(245,158,11,0.2)', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ padding: '11px 18px', borderBottom: '1px solid rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>U</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>User AI Agent ({agents.filter((a: any) => a.is_personal && !a.agent_id?.startsWith('personal-')).length})</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>AI Agent buatan user via Brain</span>
                  </div>
                  {(() => {
                    const userAgents = agents.filter((a: any) => a.is_personal && !a.agent_id?.startsWith('personal-'));
                    return userAgents.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                        <Bot size={22} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                        Belum ada AI Agent buatan user.
                      </div>
                    ) : (
                      userAgents.map((a: any, i: number) => (
                        <div key={a.agent_id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 0.8fr', gap: 10, padding: '9px 18px', borderBottom: i < userAgents.length - 1 ? '1px solid rgba(226,232,240,0.25)' : 'none', fontSize: 11, alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.name}</span>
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#d97706', fontWeight: 600 }}>@{a.owner_username}</span>
                          </div>
                          <span style={{ color: '#64748b' }}>{a.model?.split('/').pop() || '-'}</span>
                          <span style={{ color: '#64748b' }}>{a.owner_name || a.owner_username || '-'}</span>
                          <span style={{ color: a.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'center' }}>{a.is_active ? 'Active' : 'Inactive'}</span>
                          <span style={{ color: '#94a3b8', textAlign: 'right', fontSize: 10 }}>{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    );
                  })()}
                </div>

                {/* ═══ PERSONAL AI SECTION ═══ */}
                <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.15)', overflow: 'hidden' }}>
                  <div style={{ padding: '11px 18px', borderBottom: '1px solid rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>P</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Personal AI ({agents.filter((a: any) => a.is_personal && a.agent_id?.startsWith('personal-')).length})</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Asisten AI otomatis dari sistem</span>
                  </div>
                  {(() => {
                    const personalList = agents.filter((a: any) => a.is_personal && a.agent_id?.startsWith('personal-'));
                    return personalList.length === 0 ? (
                      <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                        <Bot size={24} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                        Belum ada Personal AI.
                      </div>
                    ) : (
                      personalList.map((a: any, i: number) => (
                        <div key={a.agent_id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 0.8fr', gap: 10, padding: '9px 18px', borderBottom: i < personalList.length - 1 ? '1px solid rgba(226,232,240,0.25)' : 'none', fontSize: 11, alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.name}</span>
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>@{a.owner_username}</span>
                          </div>
                          <span style={{ color: '#64748b' }}>{a.model?.split('/').pop() || '-'}</span>
                          <span style={{ color: '#64748b' }}>{a.owner_name || a.owner_username || '-'}</span>
                          <span style={{ color: a.is_active ? '#059669' : '#dc2626', fontWeight: 600, textAlign: 'center' }}>{a.is_active ? 'Active' : 'Inactive'}</span>
                          <span style={{ color: '#94a3b8', textAlign: 'right', fontSize: 10 }}>{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </>
            )}

            {/* ═══ ACTIVITY ═══ */}
            {tab === 'activity' && (
              <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Platform Activity</span>
                </div>
                <div style={{ padding: 50, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <Activity size={28} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                  <p>Activity log coming soon.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
