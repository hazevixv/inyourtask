'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, X, MoreVertical, Edit2, Trash2, Archive, 
  Pin, Folder, MessageSquare, Clock, ChevronDown, ChevronRight 
} from 'lucide-react';

interface ChatSession {
  session_id: string;
  conv_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
  folder: string;
  is_archived: boolean;
  is_pinned: boolean;
}

interface ChatSessionsSidebarProps {
  convId: string;
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  isMobile?: boolean;
}

export default function ChatSessionsSidebar({
  convId,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  isMobile = false
}: ChatSessionsSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showFolders, setShowFolders] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Load sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ convId });
      if (selectedFolder !== 'all') params.append('folder', selectedFolder);
      if (search) params.append('search', search);

      const res = await fetch(`/api/chat/sessions?${params}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (convId) loadSessions();
  }, [convId, selectedFolder, search]);

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.updated_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    let group = 'Older';
    if (date.toDateString() === today.toDateString()) {
      group = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'Yesterday';
    } else if (date > lastWeek) {
      group = 'Last 7 Days';
    } else if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      group = 'This Month';
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Older'];

  // Get unique folders
  const folders = Array.from(new Set(sessions.map(s => s.folder)));

  // Update session
  const updateSession = async (sessionId: string, updates: Partial<ChatSession>) => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...updates })
      });
      if (res.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this chat session? Messages will be kept.')) return;
    try {
      const res = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadSessions();
        if (activeSessionId === sessionId) {
          // Switch to first available session
          const remaining = sessions.filter(s => s.session_id !== sessionId);
          if (remaining.length > 0) {
            onSessionSelect(remaining[0].session_id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // Save title edit
  const saveTitle = async (sessionId: string) => {
    if (!editTitle.trim()) return;
    await updateSession(sessionId, { title: editTitle });
    setEditingSession(null);
    setEditTitle('');
  };

  return (
    <div style={{
      width: isMobile ? '100%' : 280,
      height: '100%',
      background: '#F9FAFB',
      borderRight: isMobile ? 'none' : '1px solid rgba(226,232,240,0.7)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid rgba(226,232,240,0.7)',
        background: 'white',
        flexShrink: 0
      }}>
        <button
          onClick={onNewSession}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform 120ms'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Plus size={16} /> New Chat
        </button>

        {/* Search */}
        <div style={{ 
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#F9FAFB',
          border: '1px solid rgba(226,232,240,0.7)',
          borderRadius: 8
        }}>
          <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.8125rem',
              fontFamily: 'DM Sans, sans-serif',
              background: 'transparent',
              color: '#1F2937'
            }}
          />
          {search && (
            <X 
              size={14} 
              onClick={() => setSearch('')}
              style={{ color: '#9CA3AF', cursor: 'pointer', flexShrink: 0 }}
            />
          )}
        </div>
      </div>

      {/* Folders */}
      {folders.length > 1 && (
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid rgba(226,232,240,0.5)',
          background: 'white',
          flexShrink: 0
        }}>
          <button
            onClick={() => setShowFolders(!showFolders)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            {showFolders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} />
            Folders
          </button>
          {showFolders && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => setSelectedFolder('all')}
                style={{
                  padding: '4px 10px',
                  background: selectedFolder === 'all' ? 'rgba(124,58,237,0.1)' : 'transparent',
                  border: `1px solid ${selectedFolder === 'all' ? 'rgba(124,58,237,0.3)' : 'rgba(226,232,240,0.7)'}`,
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: selectedFolder === 'all' ? '#7c3aed' : '#6B7280',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                All
              </button>
              {folders.map(folder => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  style={{
                    padding: '4px 10px',
                    background: selectedFolder === folder ? 'rgba(124,58,237,0.1)' : 'transparent',
                    border: `1px solid ${selectedFolder === folder ? 'rgba(124,58,237,0.3)' : 'rgba(226,232,240,0.7)'}`,
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: selectedFolder === folder ? '#7c3aed' : '#6B7280',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    textTransform: 'capitalize'
                  }}
                >
                  {folder}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF', fontSize: '0.875rem' }}>
            No chat sessions yet
          </div>
        ) : (
          groupOrder.map(group => {
            const groupSessions = groupedSessions[group];
            if (!groupSessions || groupSessions.length === 0) return null;

            return (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0 8px 6px',
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  {group}
                </div>
                {groupSessions.map(session => (
                  <div
                    key={session.session_id}
                    onClick={() => onSessionSelect(session.session_id)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setContextMenu({ sessionId: session.session_id, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      padding: '10px 12px',
                      marginBottom: 4,
                      background: activeSessionId === session.session_id ? 'white' : 'transparent',
                      border: `1px solid ${activeSessionId === session.session_id ? 'rgba(124,58,237,0.2)' : 'transparent'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 120ms',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      if (activeSessionId !== session.session_id) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(248,250,252,0.8)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (activeSessionId !== session.session_id) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {session.is_pinned && (
                      <Pin size={10} style={{ position: 'absolute', top: 8, right: 8, color: '#7c3aed' }} />
                    )}
                    {editingSession === session.session_id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => saveTitle(session.session_id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveTitle(session.session_id);
                          if (e.key === 'Escape') { setEditingSession(null); setEditTitle(''); }
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          border: '1px solid rgba(124,58,237,0.3)',
                          borderRadius: 4,
                          fontSize: '0.875rem',
                          fontFamily: 'DM Sans, sans-serif',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1F2937',
                          fontFamily: 'DM Sans, sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 4,
                          paddingRight: session.is_pinned ? 16 : 0
                        }}>
                          {session.title}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.75rem',
                          color: '#9CA3AF'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MessageSquare size={11} />
                            {session.message_count}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {new Date(session.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          onClick={() => setContextMenu(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 250),
              background: 'white',
              border: '1px solid rgba(226,232,240,0.7)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              padding: '6px',
              minWidth: 180,
              zIndex: 10000
            }}
          >
            {[
              { icon: <Edit2 size={14} />, label: 'Rename', action: () => {
                const session = sessions.find(s => s.session_id === contextMenu.sessionId);
                if (session) {
                  setEditingSession(session.session_id);
                  setEditTitle(session.title);
                }
                setContextMenu(null);
              }},
              { icon: <Pin size={14} />, label: 'Pin/Unpin', action: () => {
                const session = sessions.find(s => s.session_id === contextMenu.sessionId);
                if (session) {
                  updateSession(session.session_id, { is_pinned: !session.is_pinned });
                }
                setContextMenu(null);
              }},
              { icon: <Archive size={14} />, label: 'Archive', action: () => {
                updateSession(contextMenu.sessionId, { is_archived: true });
                setContextMenu(null);
              }},
              { icon: <Trash2 size={14} />, label: 'Delete', danger: true, action: () => {
                deleteSession(contextMenu.sessionId);
                setContextMenu(null);
              }}
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: item.danger ? '#dc2626' : '#374151',
                  textAlign: 'left',
                  transition: 'background 100ms'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.06)' : '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ color: item.danger ? '#dc2626' : '#6B7280' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
