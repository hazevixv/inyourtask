'use client';

import { useState, useEffect } from 'react';
import {
  X, Edit2, Camera, Phone, Mail, MapPin, Calendar, Users,
  Bot, Star, Pin, Bell, BellOff, Trash2, UserX, Flag,
  MessageSquare, Shield, Clock, ChevronRight, Check, Loader2,
  Image, FileText, Link, Volume2, Search, Settings
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

interface ChatInfoPanelProps {
  conv: any;
  user: any;
  pinnedMsgs: Set<string>;
  starredMsgs: Set<string>;
  messages: any[];
  onClose: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onMuteToggle: () => void;
  isMuted: boolean;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  getConvDisplayName: (conv: any) => string;
}

type InfoTab = 'info' | 'media' | 'starred' | 'pinned';

export default function ChatInfoPanel({
  conv, user, pinnedMsgs, starredMsgs, messages,
  onClose, onClearChat, onDeleteChat, onMuteToggle, isMuted,
  showToast, getConvDisplayName
}: ChatInfoPanelProps) {
  const [tab, setTab] = useState<InfoTab>('info');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const isAI = conv.type === 'ai_agent' || conv.type === 'ai_personal';
  const isGroup = conv.type === 'group';
  const isSelf = conv._isSelf;
  const name = getConvDisplayName(conv);

  const avatarSrc = conv.direct_avatar || conv.agent_avatar || conv.avatar || conv.owner_avatar;

  useEffect(() => {
    if (isGroup && conv.members) {
      const parsed = conv.members.split(',').map((m: string) => {
        const parts = m.split(':');
        return { username: parts[0], full_name: parts[1] || parts[0], avatar: parts[2] || '' };
      }).filter((m: any) => m.username);
      setMembers(parsed);
    }
  }, [conv, isGroup]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: editName, bio: editBio })
      });
      const data = await res.json();
      if (data.success) { showToast('Profile updated!', 'success'); setEditMode(false); }
      else showToast(data.error || 'Failed to update', 'error');
    } catch { showToast('Error updating profile', 'error'); }
    setSaving(false);
  };

  const mediaMessages = messages.filter(m => m.attachments || m.msg_type === 'image' || m.msg_type === 'file');
  const starredList = messages.filter(m => starredMsgs.has(m.msg_id));
  const pinnedList = messages.filter(m => pinnedMsgs.has(m.msg_id));

  const bgGradient = isAI
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : isGroup
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #7c3aed, #6366f1)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 700,
      background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 150ms ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: 20,
        width: 'min(440px, 92vw)',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        animation: 'slideUp 200ms ease',
      }}>
        {/* Header gradient */}
        <div style={{ height: 110, background: bgGradient, position: 'relative', flexShrink: 0 }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white', transition: 'background 120ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}>
            <X size={16} />
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 0', marginTop: -52 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: bgGradient,
              border: '4px solid white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '2rem', fontWeight: 700,
            }}>
              {avatarSrc ? (
                <img src={getAvatarUrl(avatarSrc)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : isAI ? (
                <Bot size={40} />
              ) : isGroup ? (
                <Users size={40} />
              ) : (
                getInitials(name)
              )}
            </div>
            {(isSelf || isGroup) && (
              <button style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: '#7c3aed', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}>
                <Camera size={13} />
              </button>
            )}
          </div>

          {editMode ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Name"
                style={{ padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.9375rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', textAlign: 'center', fontWeight: 700 }}
              />
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Bio / About"
                rows={2}
                style={{ padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'none', textAlign: 'center' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '9px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveProfile} disabled={saving} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 800ms linear infinite' }} /> : <Check size={14} />} Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', textAlign: 'center', marginBottom: 4 }}>
                {isGroup ? `Group · ${members.length || 0} members` : isAI ? (conv.type === 'ai_personal' ? '✨ Personal AI Assistant' : '🤖 AI Agent') : conv.direct_username || conv.username || ''}
              </div>
              {conv.description && (
                <div style={{ fontSize: '0.8125rem', color: '#374151', textAlign: 'center', marginBottom: 8, padding: '8px 12px', background: '#F9FAFB', borderRadius: 10, width: '100%', boxSizing: 'border-box' }}>{conv.description}</div>
              )}
              {isSelf && (
                <button onClick={() => { setEditName(conv.full_name || name); setEditBio(conv.bio || ''); setEditMode(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, background: 'rgba(124,58,237,0.06)', color: '#7c3aed', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                  <Edit2 size={13} /> Edit Profile
                </button>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(226,232,240,0.6)', flexShrink: 0, padding: '0 16px' }}>
          {(['info', 'media', 'starred', 'pinned'] as InfoTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              color: tab === t ? '#7c3aed' : '#6B7280',
              borderBottom: `2px solid ${tab === t ? '#7c3aed' : 'transparent'}`,
              fontFamily: 'DM Sans, sans-serif', transition: 'all 140ms', textTransform: 'capitalize',
            }}>
              {t === 'starred' ? '⭐' : t === 'pinned' ? '📌' : t === 'media' ? '🖼️' : 'ℹ️'} {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[
                  { icon: <MessageSquare size={18} />, label: 'Message', color: '#7c3aed' },
                  { icon: isMuted ? <BellOff size={18} /> : <Bell size={18} />, label: isMuted ? 'Unmute' : 'Mute', color: '#6B7280', action: onMuteToggle },
                  { icon: <Search size={18} />, label: 'Search', color: '#6B7280' },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 12, background: 'white', cursor: 'pointer', color: item.color, transition: 'all 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    {item.icon}
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Info rows */}
              {isAI && conv.role && (
                <InfoRow icon={<Shield size={15} />} label="Role" value={conv.role} />
              )}
              {isAI && conv.model && (
                <InfoRow icon={<Bot size={15} />} label="Model" value={conv.model} />
              )}
              {conv.email && <InfoRow icon={<Mail size={15} />} label="Email" value={conv.email} />}
              {conv.phone && <InfoRow icon={<Phone size={15} />} label="Phone" value={conv.phone} />}
              {conv.department && <InfoRow icon={<MapPin size={15} />} label="Department" value={conv.department} />}
              {conv.job_position && <InfoRow icon={<Settings size={15} />} label="Position" value={conv.job_position} />}
              {conv.created_at && (
                <InfoRow icon={<Calendar size={15} />} label="Joined" value={new Date(conv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              )}

              {/* Group members */}
              {isGroup && members.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Members ({members.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {members.map(m => (
                      <div key={m.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F9FAFB' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                          {m.avatar ? <img src={getAvatarUrl(m.avatar)} alt={m.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(m.full_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{m.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>@{m.username}</div>
                        </div>
                        {m.username === user?.username && <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', padding: '2px 8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 999, fontWeight: 700 }}>You</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danger zone */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={onClearChat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', cursor: 'pointer', color: '#374151', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <Trash2 size={15} style={{ color: '#ef4444' }} /> Clear Chat
                </button>
                <button onClick={onDeleteChat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, background: 'white', cursor: 'pointer', color: '#dc2626', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <UserX size={15} /> {isGroup ? 'Leave Group' : 'Delete Chat'}
                </button>
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div>
              {mediaMessages.length === 0 ? (
                <EmptyState icon="🖼️" text="No media shared yet" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {mediaMessages.map(m => (
                    <div key={m.msg_id} style={{ aspectRatio: '1', background: '#F3F4F6', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} style={{ color: '#9CA3AF' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'starred' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {starredList.length === 0 ? (
                <EmptyState icon="⭐" text="No starred messages" />
              ) : (
                starredList.map(m => (
                  <div key={m.msg_id} style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: '0.875rem', color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginBottom: 4 }}>{m.sender_full_name || m.sender} · {new Date(m.created_at).toLocaleDateString()}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.content}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'pinned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pinnedList.length === 0 ? (
                <EmptyState icon="📌" text="No pinned messages" />
              ) : (
                pinnedList.map(m => (
                  <div key={m.msg_id} style={{ padding: '10px 12px', background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, fontSize: '0.875rem', color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginBottom: 4 }}>{m.sender_full_name || m.sender} · {new Date(m.created_at).toLocaleDateString()}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.content}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
      <span style={{ color: '#7c3aed', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: '0.875rem' }}>{text}</div>
    </div>
  );
}
