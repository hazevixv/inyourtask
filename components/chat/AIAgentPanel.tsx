'use client';

import { useState } from 'react';
import {
  X, Bot, Zap, Brain, Code, FileText, BarChart2, Calendar,
  CheckSquare, Search, Globe, Database, Cpu, Sparkles,
  ChevronRight, Send, Settings, Edit2, Save, Loader2
} from 'lucide-react';

interface AIAgentPanelProps {
  agent: any;
  conv: any;
  onClose: () => void;
  onSendCommand: (cmd: string) => void;
  onUpdateAgent?: (agentId: string, data: any) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AI_CAPABILITIES = [
  { icon: <CheckSquare size={16} />, label: 'Create Task', cmd: '/task Buat task baru: ', color: '#10b981', desc: 'Create tasks from chat' },
  { icon: <Calendar size={16} />, label: 'Schedule', cmd: '/schedule Jadwalkan: ', color: '#3b82f6', desc: 'Schedule meetings & events' },
  { icon: <FileText size={16} />, label: 'Summarize', cmd: 'Tolong rangkum percakapan ini', color: '#8b5cf6', desc: 'Summarize conversations' },
  { icon: <Code size={16} />, label: 'Write Code', cmd: 'Tolong buatkan kode untuk: ', color: '#f59e0b', desc: 'Generate code snippets' },
  { icon: <BarChart2 size={16} />, label: 'Analyze Data', cmd: 'Analisis data berikut: ', color: '#ef4444', desc: 'Analyze and visualize data' },
  { icon: <Search size={16} />, label: 'Research', cmd: 'Cari informasi tentang: ', color: '#06b6d4', desc: 'Research topics' },
  { icon: <Globe size={16} />, label: 'Translate', cmd: 'Terjemahkan ke Bahasa Indonesia: ', color: '#84cc16', desc: 'Translate text' },
  { icon: <Brain size={16} />, label: 'Brainstorm', cmd: 'Bantu brainstorm ide untuk: ', color: '#ec4899', desc: 'Generate creative ideas' },
  { icon: <Database size={16} />, label: 'Query Data', cmd: '/query ', color: '#6366f1', desc: 'Query business data' },
  { icon: <Sparkles size={16} />, label: 'Improve Text', cmd: 'Perbaiki dan tingkatkan teks ini: ', color: '#f97316', desc: 'Enhance writing quality' },
];

const QUICK_PROMPTS = [
  'Apa yang bisa kamu bantu hari ini?',
  'Rangkum tugas-tugas yang belum selesai',
  'Buat laporan singkat minggu ini',
  'Bantu saya prioritaskan pekerjaan',
  'Apa deadline yang mendekat?',
  'Analisis performa tim bulan ini',
];

export default function AIAgentPanel({ agent, conv, onClose, onSendCommand, onUpdateAgent, showToast }: AIAgentPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(agent?.name || '');
  const [editDesc, setEditDesc] = useState(agent?.description || '');
  const [editPrompt, setEditPrompt] = useState(agent?.system_prompt || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'capabilities' | 'prompts' | 'settings'>('capabilities');

  const saveAgent = async () => {
    if (!onUpdateAgent || !agent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chat/agents/${agent.agent_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, system_prompt: editPrompt })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Agent updated!', 'success');
        onUpdateAgent(agent.agent_id, { name: editName, description: editDesc, system_prompt: editPrompt });
        setEditMode(false);
      } else showToast(data.error || 'Failed to update', 'error');
    } catch { showToast('Error updating agent', 'error'); }
    setSaving(false);
  };

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
        width: 'min(480px, 92vw)',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        animation: 'slideUp 200ms ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: conv?.type === 'ai_personal' ? 'linear-gradient(135deg,#7c3aed,#a78bfa)' : 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={24} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{agent?.name || 'AI Agent'}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>{agent?.role || 'AI Assistant'} · {agent?.model || 'Groq'}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(226,232,240,0.7)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(226,232,240,0.6)', padding: '0 16px', flexShrink: 0 }}>
          {(['capabilities', 'prompts', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: '11px 4px', border: 'none', background: 'none',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              color: activeTab === t ? '#7c3aed' : '#6B7280',
              borderBottom: `2px solid ${activeTab === t ? '#7c3aed' : 'transparent'}`,
              fontFamily: 'DM Sans, sans-serif', transition: 'all 140ms', textTransform: 'capitalize',
            }}>
              {t === 'capabilities' ? '⚡' : t === 'prompts' ? '💬' : '⚙️'} {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {activeTab === 'capabilities' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                Click any capability to send a command to the AI agent
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {AI_CAPABILITIES.map(cap => (
                  <button key={cap.label} onClick={() => { onSendCommand(cap.cmd); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', border: '1px solid rgba(226,232,240,0.7)',
                      borderRadius: 12, background: 'white', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 140ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.borderColor = cap.color + '40'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(226,232,240,0.7)'; }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cap.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cap.color, flexShrink: 0 }}>
                      {cap.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{cap.label}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>{cap.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                Quick prompts to get started
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QUICK_PROMPTS.map(prompt => (
                  <button key={prompt} onClick={() => { onSendCommand(prompt); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', border: '1px solid rgba(226,232,240,0.7)',
                      borderRadius: 12, background: 'white', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 140ms', gap: 10,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <span style={{ fontSize: '0.875rem', color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>{prompt}</span>
                    <Send size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {editMode ? (
                <>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.9375rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Prompt</label>
                    <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} rows={6}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveAgent} disabled={saving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {saving ? <Loader2 size={14} style={{ animation: 'spin 800ms linear infinite' }} /> : <Save size={14} />} Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Name</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>{agent?.name}</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Model</div>
                    <div style={{ fontSize: '0.875rem', color: '#374151' }}>{agent?.model || 'openai/gpt-oss-20b'}</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>System Prompt Preview</div>
                    <div style={{ fontSize: '0.8125rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{agent?.system_prompt}</div>
                  </div>
                  {(conv?.type === 'ai_personal' || agent?.created_by === agent?.owner_username) && (
                    <button onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, background: 'rgba(124,58,237,0.06)', color: '#7c3aed', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Edit2 size={14} /> Customize Agent
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
