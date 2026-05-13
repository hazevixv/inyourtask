'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, Bot, MessageSquare, CheckSquare, FolderKanban, AlertCircle, Info, Loader2, X } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';

function getNotifIcon(type: string) {
  switch (type) {
    case 'ai_action': return <Bot size={16} style={{ color: '#10b981' }} />;
    case 'chat': return <MessageSquare size={16} style={{ color: '#6366f1' }} />;
    case 'task': return <CheckSquare size={16} style={{ color: '#f59e0b' }} />;
    case 'project': return <FolderKanban size={16} style={{ color: '#8b5cf6' }} />;
    case 'error': return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
    default: return <Info size={16} style={{ color: '#6B7280' }} />;
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case 'ai_action': return { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)' };
    case 'chat': return { bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' };
    case 'task': return { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' };
    case 'project': return { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)' };
    case 'error': return { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' };
    default: return { bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)' };
  }
}

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  useEffect(() => {
    if (!authChecked || !user) return;
    loadNotifications();
  }, [authChecked, user, filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const url = filter === 'unread' ? '/api/notifications?unread=1' : '/api/notifications';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch { showToast('Error', 'error'); }
  };

  const deleteNotif = async (id: number) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const clearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      await fetch('/api/notifications?all=1', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
      showToast('All notifications cleared', 'success');
    } catch { showToast('Error', 'error'); }
  };

  const handleNotifClick = (notif: any) => {
    if (!notif.is_read) markAsRead(notif.id);
    // Navigate based on type
    try {
      const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
      if (data?.conv_id) router.push('/chat');
      else if (data?.task_id) router.push('/tasks');
      else if (data?.project_id) router.push('/projects');
    } catch {}
  };

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell activeTab="" user={user} onLogout={handleLogout} pageTitle="Notifications" onNewTask={() => router.push('/tasks')} onNewProject={() => router.push('/projects')}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px', animation: 'slideUp 280ms ease both' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif', margin: 0, letterSpacing: '-0.02em' }}>Notifications</h1>
                {unreadCount > 0 && <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{unreadCount} unread</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 9, background: 'white', color: '#374151', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, background: 'rgba(239,68,68,0.05)', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <Trash2 size={14} /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(226,232,240,0.6)', paddingBottom: 0 }}>
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 600, color: filter === f ? '#6366f1' : '#6B7280', cursor: 'pointer', borderBottom: `2px solid ${filter === f ? '#6366f1' : 'transparent'}`, marginBottom: -1, fontFamily: 'DM Sans, sans-serif', transition: 'all 140ms' }}>
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#9CA3AF' }}>
              <Loader2 size={24} style={{ animation: 'spin 800ms linear infinite' }} />
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>No notifications</div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                {filter === 'unread' ? 'All caught up! No unread notifications.' : "You're all caught up!"}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(notif => {
                const colors = getNotifColor(notif.type);
                return (
                  <div key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    style={{ display: 'flex', gap: 14, padding: '14px 16px', background: notif.is_read ? 'white' : colors.bg, border: `1px solid ${notif.is_read ? 'rgba(226,232,240,0.6)' : colors.border}`, borderRadius: 14, cursor: 'pointer', transition: 'all 180ms', position: 'relative', boxShadow: notif.is_read ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                    )}
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: notif.is_read ? '#F9FAFB' : 'white', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getNotifIcon(notif.type)}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: 3 }}>{notif.title}</div>
                      {notif.body && <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>{notif.body}</div>}
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: 6 }}>{formatTime(notif.created_at)}</div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'flex-start' }}>
                      {!notif.is_read && (
                        <button onClick={e => { e.stopPropagation(); markAsRead(notif.id); }} title="Mark as read" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(226,232,240,0.7)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366f1' }}>
                          <Check size={13} />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteNotif(notif.id); }} title="Delete" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(226,232,240,0.7)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF' }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>

      <MobileHeader title="Notifications" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
