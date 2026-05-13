'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, FolderPlus, History, LayoutTemplate, ListTodo,
  Loader2, MessageSquareText, Plus, SendHorizontal, Sparkles, SquarePen
} from 'lucide-react';
import { logger } from '@/lib/logger';
import MessageRenderer from './chat/MessageRenderer';
import styles from './AIAssistant.module.css';

interface AIAssistantProps {
  onOpenModal: (type: 'task' | 'project', initialValues?: Record<string, any> | null) => void;
  user?: any;
}

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getGreeting(name?: string) {
  const n = name || 'tim';
  return `### Halo ${n}\n\nSiap bantu analisis progress, ringkas perubahan, atau buka form task/project.\n\n- \`/task Nama Task\` — buka form task baru\n- \`/project Nama Project\` — buka form project baru\n- Tanya status, risiko, workload, atau ringkasan progres apa pun`;
}

async function createAssistantMessage(text: string): Promise<ChatMessage> {
  return { id: createId(), text, isBot: true };
}

function createUserMessage(text: string): ChatMessage {
  return { id: createId(), text, isBot: false };
}

export default function AIAssistant({ onOpenModal, user }: AIAssistantProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterActions = useMemo(() => [
    { label: 'Task Baru',       hint: 'Buka form task',          icon: ListTodo,      command: '/task ' },
    { label: 'Project Baru',    hint: 'Buka form project',       icon: FolderPlus,    command: '/project ' },
    { label: 'Analisis Beban',  hint: 'Insight prioritas & risiko', icon: Sparkles,   command: 'Analisis workload task aktif dan beri prioritas kerja hari ini.' },
    { label: 'Ringkas Progress',hint: 'Status project terkini',  icon: LayoutTemplate,command: 'Buat ringkasan progress semua project dan sebutkan bottleneck utamanya.' },
  ], []);

  const setGreetingState = useCallback(async () => {
    setMessages([await createAssistantMessage(getGreeting(user?.full_name || user?.username))]);
  }, [user?.full_name, user?.username]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await setGreetingState();
      try {
        const res = await fetch('/api/ai');
        const data = await res.json();
        if (mounted && data.success && data.conversations) setConversations(data.conversations);
      } catch (e) { logger.error('Error loading conversations:', e); }
    };
    void init();
    return () => { mounted = false; };
  }, [setGreetingState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/ai');
      const data = await res.json();
      if (data.success && data.conversations) setConversations(data.conversations);
    } catch (e) { logger.error('Error loading conversations:', e); }
  };

  const loadConversation = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/ai?sessionId=${sessionId}`);
      const data = await res.json();
      if (!data.success || !data.messages) return;
      const formatted = await Promise.all(
        data.messages.map(async (m: any) =>
          m.role === 'assistant' ? createAssistantMessage(m.content) : createUserMessage(m.content)
        )
      );
      setMessages(formatted);
      setCurrentSessionId(sessionId);
    } catch (e) { logger.error('Error loading conversation:', e); }
  };

  const startNewSession = async () => {
    setCurrentSessionId(null);
    setInput('');
    await setGreetingState();
  };

  const handleQuickAction = (command: string) => {
    setInput(command);
    document.getElementById('ai-input')?.focus();
  };

  const saveToConversation = async (userMsg: string, botMsg: string) => {
    try {
      const r1 = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, sessionId: currentSessionId, skipAI: true })
      });
      const d1 = await r1.json();
      const nextId = d1.sessionId || currentSessionId;
      await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: botMsg, sessionId: nextId, skipAI: true, isAssistant: true })
      });
      if (!currentSessionId && nextId) setCurrentSessionId(nextId);
      await loadConversations();
    } catch (e) { logger.error('Error saving conversation:', e); }
  };

  const appendAssistantMessage = async (text: string) => {
    const msg = await createAssistantMessage(text);
    setMessages(cur => [...cur, msg]);
  };

  const openDraftModal = async (type: 'task' | 'project', rawName: string) => {
    const name = rawName.trim();
    const resp = type === 'task'
      ? name ? `Form task untuk **${name}** sudah terbuka.` : 'Form task baru sudah terbuka.'
      : name ? `Form project untuk **${name}** sudah terbuka.` : 'Form project baru sudah terbuka.';
    await appendAssistantMessage(resp);
    onOpenModal(type, name ? (type === 'task' ? { task_name: name } : { project_name: name }) : null);
    await saveToConversation(type === 'task' ? `/task ${name}`.trim() : `/project ${name}`.trim(), resp);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setMessages(cur => [...cur, createUserMessage(trimmed)]);
    setInput('');
    setLoading(true);
    try {
      if (/^\/task\b/i.test(trimmed)) {
        await openDraftModal('task', trimmed.replace(/^\/task\b/i, '').trim());
        return;
      }
      if (/^\/project\b/i.test(trimmed)) {
        await openDraftModal('project', trimmed.replace(/^\/project\b/i, '').trim());
        return;
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId: currentSessionId })
      });
      const data = await res.json();
      if (!data.success) {
        await appendAssistantMessage(`Kendala: \`${data.error || 'Unknown error'}\``);
        return;
      }
      await appendAssistantMessage(data.response);
      if (!currentSessionId && data.sessionId) setCurrentSessionId(data.sessionId);
      await loadConversations();
      if (data.action?.type === 'createTask') onOpenModal('task', data.action.draftName ? { task_name: data.action.draftName } : null);
      if (data.action?.type === 'createProject') onOpenModal('project', data.action.draftName ? { project_name: data.action.draftName } : null);
    } catch (e) {
      logger.error('Error sending AI message:', e);
      await appendAssistantMessage('Tidak dapat terhubung ke AI saat ini. Coba lagi beberapa saat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <div className={styles.eyebrow}>AI Assistant</div>
            <h3>Conversations</h3>
          </div>
          <button type="button" className={styles.iconBtn} onClick={() => void startNewSession()} title="New chat">
            <Plus size={14} />
          </button>
        </div>

        <div className={styles.historyMeta}>
          <div className={styles.metaCard}>
            <span>Sessions</span>
            <strong>{conversations.length}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Active</span>
            <strong>{currentSessionId ? '1' : 'New'}</strong>
          </div>
        </div>

        <button type="button" className={styles.primaryBtn} onClick={() => void startNewSession()}>
          <Plus size={13} /> New Chat
        </button>

        <div className={styles.historyList}>
          {conversations.length === 0 ? (
            <div className={styles.emptyHistory}>
              <MessageSquareText size={14} style={{ marginBottom: 4 }} />
              <p>Belum ada history. Percakapan tersimpan otomatis.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                className={`${styles.historyItem} ${conv.session_id === currentSessionId ? styles.historyItemActive : ''}`}
                onClick={() => void loadConversation(conv.session_id)}
              >
                <strong>{conv.session_name}</strong>
                <span>{new Date(conv.updated_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <section className={styles.main}>
        {/* Quick actions */}
        <div className={styles.quickGrid}>
          {starterActions.map(action => {
            const Icon = action.icon;
            return (
              <button key={action.label} type="button" className={styles.quickCard} onClick={() => handleQuickAction(action.command)}>
                <div className={styles.quickIcon}><Icon size={14} /></div>
                <div>
                  <strong>{action.label}</strong>
                  <span>{action.hint}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat */}
        <div className={styles.chatCard}>
          <div className={styles.commandStrip}>
            <span><SquarePen size={12} /> Command: <code>/task</code> atau <code>/project</code></span>
            <span><Bot size={12} /> Konteks: data project, task &amp; log terbaru</span>
          </div>

          <div className={styles.messages}>
            {messages.map(msg => (
              <div key={msg.id} className={`${styles.messageRow} ${msg.isBot ? styles.messageBot : styles.messageUser}`}>
                {msg.isBot ? (
                  <>
                    <div className={styles.avatar}><Bot size={14} /></div>
                    <div className={styles.bubble}>
                      <MessageRenderer content={msg.text} msgType="markdown" />
                    </div>
                  </>
                ) : (
                  <div className={`${styles.bubble} ${styles.userBubble}`}>{msg.text}</div>
                )}
              </div>
            ))}
            {loading && (
              <div className={`${styles.messageRow} ${styles.messageBot}`}>
                <div className={styles.avatar}><Loader2 size={14} className={styles.spinning} /></div>
                <div className={styles.bubble}>Menyusun jawaban...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <textarea
              id="ai-input"
              className={styles.input}
              placeholder="Tanya progress, minta ringkasan, atau /task Nama Task..."
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
              }}
            />
            <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
              <SendHorizontal size={14} /> Kirim
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
