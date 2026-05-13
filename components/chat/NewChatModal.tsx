'use client';

import { useEffect, useState } from 'react';
import { X, Search, Users, MessageSquare, Bot, ChevronRight, Sparkles } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';
import styles from '../../app/chat/Chat.module.css';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

interface NewChatModalProps {
  user: any;
  agents: any[];
  onClose: () => void;
  onCreated: (convId: string, conv?: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type ModalTab = 'contacts' | 'groups' | 'ai';

export default function NewChatModal({ user, agents, onClose, onCreated, showToast }: NewChatModalProps) {
  const [tab, setTab] = useState<ModalTab>('contacts');
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  const normalizeAgent = (agent: any) => ({
    ...agent,
    is_personal: Number(agent?.is_personal) === 1,
    is_active: Number(agent?.is_active) === 1,
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/contacts');
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setGroups(data.groups || []);
        setGroupChats(data.groupChats || []);
      }
    } catch {}
    setLoading(false);
  };

  const startDirectChat = async (contact: any) => {
    setCreating(contact.username);
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', members: [contact.username] })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.conv_id, {
          conv_id: data.conv_id,
          type: 'direct',
          direct_name: contact.full_name,
          direct_avatar: contact.avatar,
          ...data.conversation
        });
      } else {
        showToast(data.error || 'Failed to start chat', 'error');
      }
    } catch {
      showToast('Error starting chat', 'error');
    }
    setCreating(null);
  };

  const openGroupChat = async (groupChat: any) => {
    onCreated(groupChat.conv_id, {
      conv_id: groupChat.conv_id,
      type: 'group',
      name: groupChat.name,
      avatar: groupChat.avatar
    });
  };

  const createGroupChat = async (group: any) => {
    setCreating(`group-${group.org_unit_id}`);
    try {
      const memberUsernames = group.members.map((m: any) => m.username);
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: group.unit_name,
          members: memberUsernames
        })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.conv_id, {
          conv_id: data.conv_id,
          type: 'group',
          name: group.unit_name
        });
      } else {
        showToast(data.error || 'Failed to create group', 'error');
      }
    } catch {
      showToast('Error creating group', 'error');
    }
    setCreating(null);
  };

  const openAgentChat = async (agent: any, activationCode?: string) => {
    setCreating(agent.agent_id);
    try {
      const convType = Number(agent?.is_personal) === 1 ? 'ai_personal' : 'ai_agent';
      const res = await fetch('/api/user/agents/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.agent_id, activation_code: activationCode || undefined })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.data?.conv_id || data.conv_id, {
          conv_id: data.data?.conv_id || data.conv_id,
          type: convType,
          agent_id: agent.agent_id,
          agent_name: agent.name,
          agent_avatar: agent.avatar,
          name: agent.name
        });
      } else if (data.code === 'activation_code_required') {
        const code = window.prompt(`Masukkan activation code untuk ${agent.name}`);
        if (code && code.trim()) {
          await openAgentChat(agent, code.trim());
          return;
        }
      } else {
        showToast(data.error || 'Failed to open agent chat', 'error');
      }
    } catch {
      showToast('Error opening agent chat', 'error');
    }
    setCreating(null);
  };

  const filteredContacts = contacts.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    !search || g.unit_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAgents = agents.map(normalizeAgent).filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.role?.toLowerCase().includes(search.toLowerCase())
  );

  const tabMeta = {
    contacts: {
      label: 'Direct',
      icon: <MessageSquare size={13} />,
      hint: 'One-to-one chat with a teammate.',
      placeholder: 'Search people...',
      count: filteredContacts.length,
    },
    groups: {
      label: 'Groups',
      icon: <Users size={13} />,
      hint: 'Team spaces based on your organizational units.',
      placeholder: 'Search groups...',
      count: filteredGroups.length,
    },
    ai: {
      label: 'AI Agents',
      icon: <Bot size={13} />,
      hint: 'Open your personal AI or a worker AI from Super Admin.',
      placeholder: 'Search AI agents...',
      count: filteredAgents.length,
    },
  } as const;

  const activeMeta = tabMeta[tab];

  const tabButtonStyle = (isActive: boolean, color: string) => ({
    flex: '1 1 120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${isActive ? color + '55' : 'rgba(226,232,240,0.8)'}`,
    background: isActive ? color + '10' : 'rgba(255,255,255,0.95)',
    color: isActive ? color : '#6B7280',
    fontWeight: 700,
    fontSize: '0.82rem',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
    boxShadow: isActive ? '0 6px 18px rgba(15,23,42,0.06)' : 'none',
    transition: 'all 150ms',
  } as React.CSSProperties);

  const cardStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 10px',
    border: '1px solid rgba(226,232,240,0.8)',
    background: 'white',
    borderRadius: 14,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 150ms',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  };

  return (
    <div className={styles.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 540, maxHeight: '84vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(226,232,240,0.6)', background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(16,185,129,0.05))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Sparkles size={14} color="#7c3aed" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7c3aed' }}>Start a conversation</span>
              </div>
              <div className={styles.modalTitle} style={{ marginBottom: 4 }}>New Chat</div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: '#6B7280' }}>
                Pick a person, team, or AI and jump straight in.
              </div>
            </div>
            <button className={styles.iconBtn} onClick={onClose}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {([
              { id: 'contacts', color: '#3b82f6' },
              { id: 'groups', color: '#f59e0b' },
              { id: 'ai', color: '#7c3aed' }
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={tabButtonStyle(tab === t.id, t.color)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {tabMeta[t.id].icon}
                  {tabMeta[t.id].label}
                </span>
                <span style={{
                  minWidth: 22,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: tab === t.id ? 'white' : '#F3F4F6',
                  color: tab === t.id ? t.color : '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textAlign: 'center'
                }}>
                  {tabMeta[t.id].count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F9FAFB', borderRadius: 12, padding: '10px 12px',
          margin: '16px 20px 12px', flexShrink: 0,
          border: '1px solid rgba(226,232,240,0.8)'
        }}>
          <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input
            placeholder={activeMeta.placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
              color: '#111827', flex: 1
            }}
          />
        </div>

        <div style={{ margin: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.5 }}>
            {activeMeta.hint}
          </div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>
            {activeMeta.count} available
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 20px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '44px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
              Loading chat targets...
            </div>
          ) : tab === 'contacts' ? (
            <div>
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '44px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', border: '1px dashed rgba(226,232,240,0.9)', borderRadius: 16, background: '#FCFCFD' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>No contacts yet</div>
                  <div style={{ fontSize: '0.75rem' }}>Contacts come from your organizational assignments</div>
                </div>
              ) : (
                <>
                  {groups.filter(g => g.members.length > 0).map(group => {
                    const groupContacts = filteredContacts.filter(c => group.members.some((m: any) => m.username === c.username));
                    if (groupContacts.length === 0) return null;
                    return (
                      <div key={group.org_unit_id} style={{ marginBottom: 16 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 0 8px', marginBottom: 6,
                          borderBottom: `1.5px solid ${group.unit_color || '#7c3aed'}25`
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: group.unit_color || '#7c3aed', flexShrink: 0
                          }} />
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700,
                            color: group.unit_color || '#7c3aed',
                            fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize'
                          }}>
                            {group.unit_name}
                          </span>
                        </div>
                        {groupContacts.map(contact => (
                          <button
                            key={contact.username}
                            onClick={() => startDirectChat(contact)}
                            disabled={creating === contact.username}
                            style={{
                              ...cardStyle,
                              marginBottom: 8,
                              opacity: creating === contact.username ? 0.6 : 1
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#FAFBFF'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; }}
                          >
                            <div style={{
                              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              overflow: 'hidden', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: 'white', fontWeight: 700,
                              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif'
                            }}>
                              {contact.avatar ? (
                                <img
                                  src={getAvatarUrl(contact.avatar)}
                                  alt={contact.full_name || contact.username}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : getInitials(contact.full_name || contact.username)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                                {contact.full_name || contact.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>
                                @{contact.username}{contact.job_position ? ` · ${contact.job_position}` : ''}
                              </div>
                            </div>
                            <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : tab === 'groups' ? (
            <div>
              {filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '44px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', border: '1px dashed rgba(226,232,240,0.9)', borderRadius: 16, background: '#FCFCFD' }}>
                  <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>No groups yet</div>
                  <div style={{ fontSize: '0.75rem' }}>Groups are created from your organizational units</div>
                </div>
              ) : (
                filteredGroups.map(group => {
                  const existingChat = groupChats.find(gc => gc.name === group.unit_name);
                  const isCreating = creating === `group-${group.org_unit_id}`;

                  return (
                    <button
                      key={group.org_unit_id}
                      onClick={() => existingChat ? openGroupChat(existingChat) : createGroupChat(group)}
                      disabled={isCreating}
                      style={{
                        ...cardStyle,
                        marginBottom: 8,
                        opacity: isCreating ? 0.6 : 1
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FAFBFF'; e.currentTarget.style.borderColor = '#fde68a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; }}
                    >
                      <div style={{
                        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                        background: group.unit_color || '#7c3aed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.1rem'
                      }}>
                        <Users size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                            {group.unit_name}
                          </span>
                          {existingChat && <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 999, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>Active</span>}
                          {group.is_primary && <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(245,158,11,0.1)', color: '#d97706', borderRadius: 999, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>⭐ Primary</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginTop: 3 }}>
                          {group.members.length + 1} members · {group.unit_type}
                          {existingChat && existingChat.last_message && ` · ${existingChat.last_message.slice(0, 30)}...`}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div>
              {filteredAgents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '44px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', border: '1px dashed rgba(226,232,240,0.9)', borderRadius: 16, background: '#FCFCFD' }}>
                  <Bot size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>No AI agents available</div>
                  <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Ask your admin or super-admin to publish more AI workers.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {filteredAgents.map(agent => {
                    const isPersonal = !!agent.is_personal;
                    return (
                      <button
                        key={agent.agent_id}
                        onClick={() => openAgentChat(agent)}
                        disabled={creating === agent.agent_id}
                        style={{
                          ...cardStyle,
                          opacity: creating === agent.agent_id ? 0.6 : 1
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = isPersonal ? '#FAF5FF' : '#F0FDF4';
                          e.currentTarget.style.borderColor = isPersonal ? '#e9d5ff' : '#bbf7d0';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)';
                        }}
                      >
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                          background: isPersonal
                            ? 'linear-gradient(135deg,#7c3aed,#a78bfa)'
                            : 'linear-gradient(135deg,#10b981,#059669)',
                          overflow: 'hidden', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'white'
                        }}>
                          {agent.avatar ? (
                            <img
                              src={getAvatarUrl(agent.avatar)}
                              alt={agent.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : <Bot size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                              {agent.name}
                            </span>
                            <span style={{
                              fontSize: '0.65rem', padding: '1px 6px',
                              background: isPersonal ? 'rgba(124,58,237,0.1)' : 'rgba(16,185,129,0.1)',
                              color: isPersonal ? '#7c3aed' : '#059669',
                              borderRadius: 999, fontWeight: 700, fontFamily: 'DM Sans, sans-serif'
                            }}>
                              {isPersonal ? 'Personal' : 'Worker'}
                            </span>
                            {!isPersonal && agent.access_type && (
                              <span style={{
                                fontSize: '0.65rem', padding: '1px 6px',
                                background: agent.access_type === 'subscription' ? 'rgba(245,158,11,0.12)' : agent.access_type === 'code' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                                color: agent.access_type === 'subscription' ? '#d97706' : agent.access_type === 'code' ? '#6366f1' : '#059669',
                                borderRadius: 999, fontWeight: 700, fontFamily: 'DM Sans, sans-serif'
                              }}>
                                {agent.access_type === 'subscription' ? 'Subscription' : agent.access_type === 'code' ? 'Code' : 'Free'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>
                            {agent.role || 'AI Assistant'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                            {isPersonal ? 'Open your exclusive assistant' : 'Open a worker AI and continue the conversation'}
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
