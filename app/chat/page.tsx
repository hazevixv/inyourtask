'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Bot, MessageSquare, Plus, Search, Send, Users, X, Loader2,
  MoreVertical, Info, ChevronDown, ArrowLeft, Reply, Edit2,
  Trash2, Smile, Check, CheckCheck, Clock, AlertCircle,
  Copy, Pin, Forward, Star, BookmarkPlus, Flag, UserX,
  Bell, BellOff, Heart, Paperclip, Mic, Video, Phone,
  CheckSquare, Settings, Zap, ChevronRight, Save
} from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import MessageRenderer from '@/components/chat/MessageRenderer';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import styles from './Chat.module.css';

const VoiceRecorder = dynamic(() => import('@/components/chat/VoiceRecorder'), { ssr: false });
const FileUploader = dynamic(() => import('@/components/chat/FileUploader'), { ssr: false });
const EmojiPicker = dynamic(() => import('@/components/chat/EmojiPicker'), { ssr: false });
const NewChatModal = dynamic(() => import('@/components/chat/NewChatModal'), { ssr: false });
const ChatInfoPanel = dynamic(() => import('@/components/chat/ChatInfoPanel'), { ssr: false });
const AIAgentPanel = dynamic(() => import('@/components/chat/AIAgentPanel'), { ssr: false });
const AttachmentMenu = dynamic(() => import('@/components/chat/AttachmentMenu'), { ssr: false });
const ChatHeaderMenu = dynamic(() => import('@/components/chat/ChatHeaderMenu'), { ssr: false });
const ChatSessionsSidebar = dynamic(() => import('@/components/chat/ChatSessionsSidebar'), { ssr: false });

type TabType = 'all' | 'direct' | 'groups' | 'ai';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

function getInitials(n: string) {
  return n?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function ConvAvatar({ src, name, size = 48, type = 'direct' }: {
  src?: string | null; name?: string; size?: number;
  type?: 'ai_personal' | 'ai_agent' | 'direct' | 'group';
}) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  const isAI = type === 'ai_agent' || type === 'ai_personal';
  const bs = Math.round(size * 0.38);
  const bo = Math.round(size * 0.04);
  const bgMap: Record<string, string> = {
    ai_personal: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    ai_agent: 'linear-gradient(135deg,#10b981,#059669)',
    direct: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    group: 'linear-gradient(135deg,#f59e0b,#d97706)',
  };
  const badge = isAI ? (
    <div style={{ position:'absolute', bottom:bo, right:bo, width:bs, height:bs, borderRadius:'50%', background:bgMap[type], border:`${Math.max(2,Math.round(size*0.05))}px solid white`, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
      <Bot size={Math.round(bs*0.6)} color="white" strokeWidth={2.5} />
    </div>
  ) : type === 'direct' ? (
    <div style={{ position:'absolute', bottom:bo, right:bo, width:Math.round(size*0.28), height:Math.round(size*0.28), borderRadius:'50%', background:'#10b981', border:`${Math.max(2,Math.round(size*0.05))}px solid white`, zIndex:2 }} />
  ) : null;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0, borderRadius:'50%', overflow:'visible' }}>
      <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', background:bgMap[type]||bgMap.direct, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:Math.round(size*0.35), fontWeight:700 }}>
        {url && !err ? <img src={url} alt={name||''} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={()=>setErr(true)} /> : type==='group' ? <Users size={Math.round(size*0.42)} /> : isAI ? <Bot size={Math.round(size*0.42)} /> : getInitials(name||'?')}
      </div>
      {badge}
    </div>
  );
}

function MsgStatus({ status }: { status?: string }) {
  if (!status || status === 'sending') return <Clock size={11} style={{ color:'rgba(107,114,128,0.7)' }} />;
  if (status === 'sent') return <Check size={11} style={{ color:'rgba(107,114,128,0.8)' }} />;
  if (status === 'delivered') return <CheckCheck size={11} style={{ color:'rgba(107,114,128,0.8)' }} />;
  if (status === 'read') return <CheckCheck size={11} style={{ color:'#3b82f6' }} />;
  if (status === 'failed') return <AlertCircle size={11} style={{ color:'#ef4444' }} />;
  return null;
}

function formatTime(d: string | Date) {
  if (!d) return '';
  const dt = new Date(d), now = new Date(), diff = now.getTime() - dt.getTime();
  if (diff < 86400000) return dt.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  if (diff < 604800000) return dt.toLocaleDateString('id-ID', { weekday:'short' });
  return dt.toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function formatMsgDate(d: string | Date) {
  const dt = new Date(d), now = new Date(), diff = now.getTime() - dt.getTime();
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return dt.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}

function normalizeAgent(agent: any) {
  return {
    ...agent,
    is_personal: Number(agent?.is_personal) === 1,
    is_active: Number(agent?.is_active) === 1,
    is_public: Number(agent?.is_public) === 1,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();

  // ── Core state ──
  const [conversations, setConversations] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ── UI panels ──
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState<any>(null);
  const [showSessionsSidebar, setShowSessionsSidebar] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // ── Message actions ──
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [msgContextMenu, setMsgContextMenu] = useState<{ msg: any; x: number; y: number } | null>(null);
  const [msgSearch, setMsgSearch] = useState('');
  const [pinnedMsgs, setPinnedMsgs] = useState<Set<string>>(new Set());
  const [starredMsgs, setStarredMsgs] = useState<Set<string>>(new Set());
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [showNoteModal, setShowNoteModal] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement>>({});

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  // ── Data loaders ──
  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch('/api/chat/conversations');
      const d = await r.json();
      if (d.success) setConversations(d.conversations);
    } catch {}
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const r = await fetch('/api/chat/agents?settings=1');
      const d = await r.json();
      if (d.success) setAgents((d.agents || []).map(normalizeAgent));
    } catch {}
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const r = await fetch(`/api/chat/messages?convId=${convId}`);
      const d = await r.json();
      if (d.success) {
        setMessages(d.messages);
        const rMap: Record<string, any[]> = {};
        for (const msg of d.messages) {
          if (msg.reaction_count > 0) {
            try {
              const rr = await fetch(`/api/chat/reactions?msgId=${msg.msg_id}`);
              const rd = await rr.json();
              if (rd.success && rd.reactions.length > 0) rMap[msg.msg_id] = rd.reactions;
            } catch {}
          }
        }
        setReactions(rMap);
      }
    } catch {}
  }, []);

  // ── Init ──
  useEffect(() => {
    if (!authChecked || !user) return;
    setLoading(true);
    const isMobileNow = window.innerWidth <= 768;
    setIsMobile(isMobileNow);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    const init = async () => {
      let loadedFromInit = false;
      try {
        const r = await fetch('/api/chat/init', { method: 'POST' });
        const d = await r.json();
        if (d.success && d.conversations) {
          loadedFromInit = true;
          setConversations(d.conversations);
          const preferred = d.conversations.find((c: any) => c.type === 'ai_personal')
            || d.conversations.find((c: any) => c.type === 'ai_agent')
            || d.conversations[0];
          await loadAgents();
          if (preferred && !isMobileNow) {
            setActiveConv(preferred);
            setMessages([]);
            setReplyTo(null);
            setEditingMsg(null);
            setSelectionMode(false);
            setSelectedMsgs(new Set());
            if (preferred.type === 'ai_agent' || preferred.type === 'ai_personal') {
              try {
                const res = await fetch(`/api/chat/sessions?convId=${preferred.conv_id}`);
                const data = await res.json();
                if (res.status === 503 || data.warning) {
                  setActiveSessionId(null);
                } else if (data.success && data.sessions.length > 0) {
                  setActiveSessionId(data.sessions[0].session_id);
                } else {
                  const createRes = await fetch('/api/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ convId: preferred.conv_id, title: 'General Chat' })
                  });
                  const createData = await createRes.json();
                  setActiveSessionId(createData.success ? createData.sessionId : null);
                }
              } catch {
                setActiveSessionId(null);
              }
            } else {
              setActiveSessionId(null);
            }
            await loadMessages(preferred.conv_id);
          }
        } else await loadConversations();
      } catch { await loadConversations(); }
      if (!loadedFromInit) {
        await loadAgents();
      }
      setLoading(false);
    };
    init();
    return () => window.removeEventListener('resize', checkMobile);
  }, [authChecked, user, loadAgents, loadConversations, loadMessages]);

  // ── Polling - IMPROVED (slower interval, pause when user interacting) ──
  useEffect(() => {
    if (!activeConv) return;
    
    const poll = () => {
      // Don't poll if user is currently interacting (scrolling, typing, etc)
      if (!isUserInteractingRef.current && !sending && !editingMsg) {
        loadMessages(activeConv.conv_id);
        loadConversations();
      }
    };
    
    // Initial load
    poll();
    
    // Poll every 5 seconds (increased from 3s to reduce interruptions)
    pollRef.current = setInterval(poll, 5000);
    
    return () => { 
      if (pollRef.current) clearInterval(pollRef.current); 
    };
  }, [activeConv, sending, editingMsg, loadMessages, loadConversations]);

  // ── Auto scroll - IMPROVED ──
  const lastMessageCountRef = useRef(0);
  const isUserInteractingRef = useRef(false);
  
  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    
    // Only auto-scroll if:
    // 1. User is at bottom (within 150px)
    // 2. New message was added (not just update)
    // 3. User is not currently interacting
    const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 150;
    const newMessageAdded = messages.length > lastMessageCountRef.current;
    
    if (atBottom && newMessageAdded && !isUserInteractingRef.current) {
      // Use setTimeout to avoid interrupting user scroll
      setTimeout(() => {
        if (!isUserInteractingRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    
    lastMessageCountRef.current = messages.length;
    
    // Update scroll button visibility
    setShowScrollButton(!atBottom && messages.length > 0);
  }, [messages]);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Mark user as interacting
      isUserInteractingRef.current = true;
      
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // After 2 seconds of no scrolling, mark as not interacting
      scrollTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 2000);
      
      // Check if at bottom
      const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 150;
      setShowScrollButton(!atBottom && messages.length > 0);
      
      if (atBottom) {
        setUserScrolled(false);
      }
    };
    
    const handleWheel = () => {
      isUserInteractingRef.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 2000);
    };
    
    const handleTouchStart = () => {
      isUserInteractingRef.current = true;
    };
    
    const handleTouchEnd = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 2000);
    };
    
    c.addEventListener('scroll', handleScroll);
    c.addEventListener('wheel', handleWheel, { passive: true });
    c.addEventListener('touchstart', handleTouchStart, { passive: true });
    c.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      c.removeEventListener('scroll', handleScroll);
      c.removeEventListener('wheel', handleWheel);
      c.removeEventListener('touchstart', handleTouchStart);
      c.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(scrollTimeout);
    };
  }, [messages.length]);

  // ── Close menus on outside click ──
  useEffect(() => {
    const h = (e: MouseEvent) => {
      setMsgContextMenu(null);
      setShowReactionPicker(null);
      setShowHeaderMenu(false);
      setShowAttachMenu(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const scrollToBottom = () => { 
    isUserInteractingRef.current = false; // Reset interaction flag
    setUserScrolled(false); 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  };
  const scrollToMsg = (msgId: string) => {
    const el = msgRefs.current[msgId];
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.background = 'rgba(124,58,237,0.08)'; setTimeout(() => { el.style.background = ''; }, 1500); }
  };

  const getConvDisplayName = (conv: any) => {
    if (!conv) return '';
    if (conv.type === 'ai_agent' || conv.type === 'ai_personal') {
      if (conv.agent_name) return conv.agent_name;
      if (conv.name) return conv.name;
      const a = agents.find(a => a.agent_id === conv.agent_id);
      return a?.name || (conv.type === 'ai_personal' ? 'My AI Assistant' : 'AI Agent');
    }
    if (conv.name) return conv.name;
    if (conv.type === 'direct') {
      if (conv.direct_name) return conv.direct_name.trim().split(/\s+/).slice(0, 2).join(' ');
      const raw = conv.members || '';
      const pair = raw.split(',').find((m: string) => m.split(':')[0]?.trim() !== user?.username);
      if (pair) { const parts = pair.split(':'); return parts[1]?.trim() || parts[0]?.trim() || 'Direct Chat'; }
      return 'Direct Chat';
    }
    return conv.name || 'Chat';
  };

  const openConversation = async (conv: any) => {
    const enriched = { ...conv };
    if ((conv.type === 'ai_agent' || conv.type === 'ai_personal') && !conv.agent_name) {
      const a = agents.find(a => a.agent_id === conv.agent_id);
      if (a) { enriched.agent_name = a.name; enriched.agent_avatar = a.avatar; }
    }
    setActiveConv(enriched);
    setMessages([]);
    setReplyTo(null);
    setEditingMsg(null);
    setSelectionMode(false);
    setSelectedMsgs(new Set());
    
    // Load session for AI conversations (with fallback if table doesn't exist)
    if (conv.type === 'ai_agent' || conv.type === 'ai_personal') {
      try {
        const res = await fetch(`/api/chat/sessions?convId=${conv.conv_id}`);
        const data = await res.json();
        
        // If table doesn't exist (503 or warning), skip session management for now
        if (res.status === 503 || data.warning) {
          console.warn('Chat sessions table not found. Session management disabled. Run migration: migrations/008_chat_sessions.sql');
          setActiveSessionId(null);
        } else if (data.success && data.sessions.length > 0) {
          setActiveSessionId(data.sessions[0].session_id);
        } else {
          // Create default session
          const createRes = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ convId: conv.conv_id, title: 'General Chat' })
          });
          const createData = await createRes.json();
          if (createData.success) {
            setActiveSessionId(createData.sessionId);
          } else {
            // If creation fails, continue without session
            console.warn('Could not create session, continuing without session management');
            setActiveSessionId(null);
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        // Continue without session management
        setActiveSessionId(null);
      }
    }
    
    await loadMessages(conv.conv_id);
    loadConversations();
    if (isMobile) setShowMobileChat(true);
  };

  const openAgentChat = async (agent: any, activationCode?: string) => {
    try {
      const type = Number(agent?.is_personal) === 1 ? 'ai_personal' : 'ai_agent';
      const r = await fetch('/api/user/agents/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.agent_id, activation_code: activationCode || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        await loadConversations();
        openConversation({
          conv_id: d.data?.conv_id || d.conv_id,
          type,
          agent_id: agent.agent_id,
          agent_avatar: agent.avatar,
          agent_name: agent.name,
          name: agent.name
        } as any);
        return;
      }

      if (d.code === 'activation_code_required') {
        const code = window.prompt(`Masukkan activation code untuk ${agent.name}`);
        if (code && code.trim()) return openAgentChat(agent, code.trim());
      }
      if (d.code === 'subscription_required') {
        showToast('Worker ini butuh subscription aktif.', 'error');
      }
    } catch {
      showToast('Failed to open AI chat', 'error');
    }
  };

  // ── Send message ──
  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || !activeConv || sending) return;
    setInput('');
    const curReply = replyTo;
    setReplyTo(null);
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { msg_id:tempId, sender:user?.username, content:text, msg_type:'text', created_at:new Date(), status:'sending', reply_to:curReply?.msg_id, reply_content:curReply?.content, reply_sender:curReply?.sender }]);
    const isAI = activeConv.type === 'ai_agent' || activeConv.type === 'ai_personal';
    if (isAI) setIsTyping(true);
    try {
      const r = await fetch('/api/chat/messages', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify({ 
          convId:activeConv.conv_id, 
          content:text, 
          replyTo:curReply?.msg_id,
          sessionId: activeSessionId || null  // Send null if no session (table doesn't exist)
        }) 
      });
      const d = await r.json();
      if (d.success) { await loadMessages(activeConv.conv_id); loadConversations(); }
    } catch { showToast('Failed to send message', 'error'); }
    finally { setSending(false); setIsTyping(false); }
  };

  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!activeConv || sending) return;
    setSending(true); setShowVoiceRecorder(false);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      fd.append('duration', duration.toString());
      const ur = await fetch('/api/chat/voice', { method:'POST', body:fd });
      const ud = await ur.json();
      if (!ud.success) throw new Error(ud.error);
      const r = await fetch('/api/chat/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ convId:activeConv.conv_id, content:'🎤 Voice message', msgType:'voice', voiceData:ud.voiceData }) });
      const d = await r.json();
      if (d.success) { await loadMessages(activeConv.conv_id); loadConversations(); }
    } catch (e: any) { showToast(e.message || 'Failed to send voice', 'error'); }
    finally { setSending(false); }
  };

  const sendFileMessage = async (files: any[]) => {
    if (!activeConv || sending) return;
    setSending(true); setShowFileUploader(false);
    try {
      const r = await fetch('/api/chat/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ convId:activeConv.conv_id, content:`📎 ${files.length} file(s)`, msgType:'file', attachments:files }) });
      const d = await r.json();
      if (d.success) { await loadMessages(activeConv.conv_id); loadConversations(); }
    } catch (e: any) { showToast(e.message || 'Failed to send files', 'error'); }
    finally { setSending(false); }
  };

  // ── Message actions ──
  const saveEdit = async () => {
    if (!editingMsg || !editContent.trim()) return;
    try {
      const r = await fetch('/api/chat/messages', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ msgId:editingMsg.msg_id, action:'edit', content:editContent }) });
      const d = await r.json();
      if (d.success) { showToast('Message edited', 'success'); setEditingMsg(null); setEditContent(''); await loadMessages(activeConv.conv_id); }
      else showToast(d.error || 'Failed to edit', 'error');
    } catch { showToast('Error editing message', 'error'); }
  };

  const deleteMessage = async (msg: any) => {
    if (!confirm('Delete this message?')) return;
    setMsgContextMenu(null);
    try {
      const r = await fetch('/api/chat/messages', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ msgId:msg.msg_id, action:'delete' }) });
      const d = await r.json();
      if (d.success) { showToast('Message deleted', 'success'); await loadMessages(activeConv.conv_id); }
      else showToast(d.error || 'Failed to delete', 'error');
    } catch { showToast('Error deleting message', 'error'); }
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
    setShowReactionPicker(null);
    try {
      const r = await fetch('/api/chat/reactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ msgId, emoji }) });
      const d = await r.json();
      if (d.success) {
        const rr = await fetch(`/api/chat/reactions?msgId=${msgId}`);
        const rd = await rr.json();
        if (rd.success) setReactions(prev => ({ ...prev, [msgId]:rd.reactions }));
      }
    } catch {}
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => showToast('Copied!', 'success'));
    setMsgContextMenu(null);
  };

  const pinMessage = (msg: any) => {
    setPinnedMsgs(prev => { const n = new Set(prev); n.has(msg.msg_id) ? (n.delete(msg.msg_id), showToast('Unpinned', 'info')) : (n.add(msg.msg_id), showToast('Message pinned 📌', 'success')); return n; });
    setMsgContextMenu(null);
  };

  const starMessage = (msg: any) => {
    setStarredMsgs(prev => { const n = new Set(prev); n.has(msg.msg_id) ? (n.delete(msg.msg_id), showToast('Unstarred', 'info')) : (n.add(msg.msg_id), showToast('Message starred ⭐', 'success')); return n; });
    setMsgContextMenu(null);
  };

  const forwardMessage = async (targetConvId: string) => {
    if (!showForwardModal) return;
    try {
      const r = await fetch('/api/chat/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ convId:targetConvId, content:`↪️ *Forwarded*\n${showForwardModal.content}` }) });
      const d = await r.json();
      if (d.success) { showToast('Message forwarded!', 'success'); setShowForwardModal(null); loadConversations(); }
      else showToast(d.error || 'Failed to forward', 'error');
    } catch { showToast('Error forwarding', 'error'); }
  };

  const toggleSelectMsg = (msgId: string) => {
    setSelectedMsgs(prev => { const n = new Set(prev); n.has(msgId) ? n.delete(msgId) : n.add(msgId); return n; });
  };

  const deleteSelectedMsgs = async () => {
    if (selectedMsgs.size === 0) return;
    if (!confirm(`Delete ${selectedMsgs.size} message(s)?`)) return;
    for (const msgId of Array.from(selectedMsgs)) {
      try { await fetch('/api/chat/messages', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ msgId, action:'delete' }) }); } catch {}
    }
    showToast(`${selectedMsgs.size} messages deleted`, 'success');
    setSelectedMsgs(new Set()); setSelectionMode(false);
    await loadMessages(activeConv.conv_id);
  };

  const clearChat = async () => {
    if (!activeConv || !confirm('Clear all messages in this chat?')) return;
    setShowInfoPanel(false);
    showToast('Chat cleared', 'info');
    setMessages([]);
  };

  const handleMuteToggle = () => { setIsMuted(p => !p); showToast(isMuted ? 'Notifications unmuted' : 'Notifications muted 🔕', 'info'); };
  const handleFavourite = () => { setIsFavourite(p => !p); showToast(isFavourite ? 'Removed from favourites' : 'Added to favourites ❤️', 'success'); };

  // ── Filtered data ──
  const filteredConvs = conversations.filter(c => {
    const matchSearch = !search || (c.name || c.members || c.agent_name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (tab === 'direct') return c.type === 'direct';
    if (tab === 'groups') return c.type === 'group';
    if (tab === 'ai') return c.type === 'ai_agent' || c.type === 'ai_personal';
    return true;
  }).sort((a, b) => {
    if (a.type === 'ai_personal') return -1;
    if (b.type === 'ai_personal') return 1;
    return (b.last_msg_at ? new Date(b.last_msg_at).getTime() : 0) - (a.last_msg_at ? new Date(a.last_msg_at).getTime() : 0);
  });

  const aiAgents = agents.filter(a => Number(a.is_active) === 1 && !a.is_deleted);
  const personalAIs = aiAgents.filter(a => Number(a.is_personal) === 1);
  const workerAIs = aiAgents.filter(a => Number(a.is_personal) === 0);
  const hasConversationForAgent = (agentId: string) => conversations.some(c => c.agent_id === agentId && (c.type === 'ai_agent' || c.type === 'ai_personal'));

  const filteredMessages = msgSearch ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase())) : messages;
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  let lastDate = '';
  for (const msg of filteredMessages) {
    const d = formatMsgDate(msg.created_at);
    if (d !== lastDate) { groupedMessages.push({ date:d, msgs:[] }); lastDate = d; }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  const activeAgent = activeConv ? agents.find(a => a.agent_id === activeConv.agent_id) : null;
  const isAIConv = activeConv?.type === 'ai_agent' || activeConv?.type === 'ai_personal';
  const emptyStateByTab: Record<TabType, { title: string; desc: string; action?: string }> = {
    all: { title: 'No conversations yet', desc: 'Start a direct chat, create a group, or open an AI agent from the AI section.', action: 'New Chat' },
    direct: { title: 'No direct chats yet', desc: 'Direct messages with coworkers will appear here.', action: 'New Chat' },
    groups: { title: 'No group chats yet', desc: 'Group chats from your organizational units will appear here.', action: 'New Chat' },
    ai: { title: 'No AI conversations yet', desc: 'Open your personal AI or a worker AI from the AI section.', action: 'New Chat' },
  };

  if (!authChecked) return <PageLoader />;

  const topbarRight = (
    <button className={styles.iconBtn} onClick={() => setShowNewChat(true)} title="New Chat"><Plus size={16} /></button>
  );

  return (
    <>
      <AppShell activeTab="chat" user={user} onLogout={handleLogout} pageTitle="Chat" topbarRight={topbarRight} onNewTask={() => router.push('/tasks')} onNewProject={() => router.push('/projects')}>
        <div className={styles.shell}>
          {/* ══════════════════════════════════════════════════════════════════
              LEFT PANEL - Conversation List
          ══════════════════════════════════════════════════════════════════ */}
          <div className={`${styles.left} ${isMobile && showMobileChat ? styles.mobileHidden : ''}`}>
            <div className={styles.leftHeader}>
              <div className={styles.leftHeaderTop}>
                <span className={styles.leftTitle}>Messages</span>
                <div className={styles.headerActions}>
                  <button className={styles.iconBtn} onClick={() => setShowNewChat(true)} title="New Chat"><Plus size={15} /></button>
                </div>
              </div>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div className={styles.tabs}>
              {(['all','direct','groups','ai'] as TabType[]).map(t => (
                <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                  {t === 'all' ? 'All' : t === 'direct' ? 'Direct' : t === 'groups' ? 'Groups' : 'AI'}
                </button>
              ))}
            </div>

            <div className={styles.convList}>
              {loading ? (
                <div style={{ padding:'20px', textAlign:'center', color:'#9CA3AF' }}><Loader2 size={20} className={styles.spinning} /></div>
              ) : filteredConvs.length === 0 ? (
                <div style={{ padding:'24px 20px', textAlign:'center', color:'#9CA3AF' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    {emptyStateByTab[tab].title}
                  </div>
                  <div style={{ fontSize:'0.82rem', lineHeight:1.5, marginBottom: 10 }}>
                    {emptyStateByTab[tab].desc}
                  </div>
                  <button className={styles.btnPrimary} onClick={() => setShowNewChat(true)}>
                    <Plus size={14} style={{ marginRight: 6 }} />
                    {emptyStateByTab[tab].action}
                  </button>
                </div>
              ) : (
                filteredConvs.map(conv => {
                  const name = getConvDisplayName(conv);
                  const isAI = conv.type === 'ai_agent' || conv.type === 'ai_personal';
                  const isGroup = conv.type === 'group';
                  const avatarSrc = conv.type === 'ai_personal' ? (conv.owner_avatar || conv.agent_avatar) : isAI ? conv.agent_avatar : isGroup ? conv.avatar : conv.direct_avatar;
                  return (
                    <div key={conv.conv_id} className={`${styles.convItem} ${activeConv?.conv_id === conv.conv_id ? styles.convItemActive : ''}`} onClick={() => openConversation(conv)}>
                      <ConvAvatar src={avatarSrc} name={name} size={48} type={conv.type as any} />
                      <div className={styles.convInfo}>
                        <div className={styles.convName}>
                          {name}
                          {conv.type === 'ai_personal' && <span style={{ marginLeft:6, fontSize:'0.625rem', fontWeight:700, padding:'1px 6px', background:'rgba(124,58,237,0.1)', color:'#7c3aed', borderRadius:999 }}>MY AI</span>}
                        </div>
                        <div className={styles.convPreview}>{conv.last_message || (conv.type === 'ai_personal' ? '✨ Your personal AI assistant' : isAI ? 'Chat with AI Agent' : 'Start a conversation')}</div>
                      </div>
                      <div className={styles.convMeta}>
                        <span className={styles.convTime}>{conv.last_msg_at ? formatTime(conv.last_msg_at) : ''}</span>
                        {conv.unread_count > 0 && <span className={styles.unreadBadge}>{conv.unread_count}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {(tab === 'all' || tab === 'ai') && (
              <div className={styles.agentSection}>
                <div className={styles.agentSectionTitle}>AI Agents</div>
                <div className={styles.agentList}>
                  {personalAIs.length > 0 && (
                    <div style={{ width: '100%', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', margin: '0 0 8px 4px' }}>Personal AI</div>
                      {personalAIs.map(agent => (
                        <div key={agent.agent_id} className={styles.agentItem} onClick={() => openAgentChat(agent)}>
                          <ConvAvatar src={agent.avatar} name={agent.name} size={34} type="ai_personal" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={styles.agentName}>
                              {agent.name}
                              {hasConversationForAgent(agent.agent_id) && <span style={{ marginLeft: 6, fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 999 }}>Open</span>}
                            </div>
                            <div className={styles.agentRole}>{agent.role || 'Personal Assistant'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {workerAIs.length > 0 && (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', margin: '0 0 8px 4px' }}>Worker AI</div>
                      {workerAIs.map(agent => (
                        <div key={agent.agent_id} className={styles.agentItem} onClick={() => openAgentChat(agent)}>
                          <ConvAvatar src={agent.avatar} name={agent.name} size={34} type="ai_agent" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={styles.agentName}>
                              {agent.name}
                              {agent.access_type && (
                                <span style={{ marginLeft: 6, fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: agent.access_type === 'subscription' ? 'rgba(245,158,11,0.12)' : agent.access_type === 'code' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: agent.access_type === 'subscription' ? '#d97706' : agent.access_type === 'code' ? '#6366f1' : '#059669' }}>
                                  {agent.access_type === 'subscription' ? 'Subscription' : agent.access_type === 'code' ? 'Code' : 'Free'}
                                </span>
                              )}
                              {hasConversationForAgent(agent.agent_id) && <span style={{ marginLeft: 6, fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 999 }}>Open</span>}
                            </div>
                            <div className={styles.agentRole}>{agent.role || 'AI Worker'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {personalAIs.length === 0 && workerAIs.length === 0 && (
                    <div style={{ padding: '12px 8px', color: '#9CA3AF', fontSize: '0.85rem' }}>
                      No AI agents available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT PANEL - Chat Area
          ══════════════════════════════════════════════════════════════════ */}
          <div className={`${styles.right} ${isMobile && showMobileChat ? styles.mobileVisible : ''}`}>
            {!activeConv ? (
              <div className={styles.emptyChat}>
                <div className={styles.emptyChatIcon}><MessageSquare size={32} /></div>
                <h3>Select a conversation</h3>
                <p>Choose from your existing conversations or start a new one</p>
                <button className={styles.btnPrimary} onClick={() => setShowNewChat(true)}><Plus size={14} style={{ marginRight:6 }} /> New Chat</button>
              </div>
            ) : (
              <>
                {/* ── Chat Header ── */}
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderLeft}>
                    {isMobile && <button className={styles.mobileBackBtn} onClick={() => { setShowMobileChat(false); setActiveConv(null); }}><ArrowLeft size={20} /></button>}
                    <ConvAvatar src={activeConv.type === 'ai_personal' ? (activeConv.agent_avatar || activeConv.owner_avatar) : isAIConv ? activeConv.agent_avatar : activeConv.direct_avatar} name={getConvDisplayName(activeConv)} size={44} type={activeConv.type as any} />
                    <div>
                      <div className={styles.chatName}>
                        {getConvDisplayName(activeConv)}
                        {activeConv.type === 'ai_personal' && <span style={{ marginLeft:6, fontSize:'0.625rem', fontWeight:700, padding:'1px 6px', background:'rgba(124,58,237,0.15)', color:'#7c3aed', borderRadius:999 }}>MY AI</span>}
                      </div>
                      <div className={`${styles.chatStatus} ${isAIConv ? '' : styles.chatStatusOffline}`}>
                        {activeConv.type === 'ai_personal' ? '✨ Personal Assistant' : activeConv.type === 'ai_agent' ? '● Online' : 'Active'}
                      </div>
                    </div>
                  </div>
                  <div className={styles.chatHeaderActions}>
                    {isAIConv && isMobile && (
                      <button 
                        className={styles.iconBtn} 
                        title="Sessions" 
                        onClick={() => setShowSessionsSidebar(true)}
                        style={{ 
                          background: 'rgba(124,58,237,0.1)', 
                          border: '1px solid rgba(124,58,237,0.3)',
                          color: '#7c3aed'
                        }}
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                    {isAIConv && <button className={styles.iconBtn} title="AI Capabilities" onClick={() => setShowAIPanel(true)}><Zap size={16} /></button>}
                    <button className={styles.iconBtn} title="Search messages" onClick={() => setShowMsgSearch(p => !p)}><Search size={16} /></button>
                    <button className={styles.iconBtn} title="Contact Info" onClick={() => setShowInfoPanel(true)}><Info size={16} /></button>
                    <div style={{ position:'relative' }}>
                      <button className={styles.iconBtn} title="More" onClick={e => { e.stopPropagation(); setShowHeaderMenu(p => !p); }}><MoreVertical size={16} /></button>
                      {showHeaderMenu && (
                        <ChatHeaderMenu
                          onClose={() => setShowHeaderMenu(false)}
                          onContactInfo={() => { setShowInfoPanel(true); setShowHeaderMenu(false); }}
                          onSearch={() => { setShowMsgSearch(true); setShowHeaderMenu(false); }}
                          onSelectMessages={() => { setSelectionMode(true); setShowHeaderMenu(false); }}
                          onMuteToggle={handleMuteToggle}
                          onDisappearing={() => showToast('Disappearing messages coming soon', 'info')}
                          onFavourite={handleFavourite}
                          onReport={() => showToast('Report submitted', 'info')}
                          onBlock={() => showToast('User blocked', 'info')}
                          onClearChat={clearChat}
                          onDeleteChat={() => { if (confirm('Delete this chat?')) { setActiveConv(null); showToast('Chat deleted', 'info'); } }}
                          isMuted={isMuted}
                          isFavourite={isFavourite}
                          convType={activeConv.type}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Selection Mode Bar ── */}
                {selectionMode && (
                  <div style={{ padding:'10px 20px', background:'rgba(124,58,237,0.08)', borderBottom:'1px solid rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:0 }}><X size={18} /></button>
                      <span style={{ fontSize:'0.875rem', fontWeight:600, color:'#7c3aed' }}>{selectedMsgs.size} selected</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={deleteSelectedMsgs} disabled={selectedMsgs.size === 0} style={{ padding:'6px 12px', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, background:'white', color:'#dc2626', fontSize:'0.8125rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><Trash2 size={13} /> Delete</button>
                      <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); }} style={{ padding:'6px 12px', border:'1px solid rgba(226,232,240,0.7)', borderRadius:8, background:'white', color:'#374151', fontSize:'0.8125rem', fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* ── Message Search Bar ── */}
                {showMsgSearch && (
                  <div style={{ padding:'8px 20px', borderBottom:'1px solid rgba(226,232,240,0.6)', background:'white', display:'flex', gap:8, alignItems:'center' }}>
                    <Search size={14} style={{ color:'#9CA3AF', flexShrink:0 }} />
                    <input autoFocus placeholder="Search in conversation..." value={msgSearch} onChange={e => setMsgSearch(e.target.value)}
                      style={{ flex:1, border:'none', outline:'none', fontSize:'0.875rem', fontFamily:'DM Sans, sans-serif', color:'#1F2937', background:'transparent' }} />
                    {msgSearch && <button onClick={() => setMsgSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0 }}><X size={14} /></button>}
                    <button onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', fontSize:'0.8125rem' }}>Close</button>
                  </div>
                )}

                {/* ── Messages Area ── */}
                <div className={styles.messages} ref={messagesContainerRef}>
                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      <div className={styles.dateSep}><span className={styles.dateSepText}>{group.date}</span></div>
                      {group.msgs.map(msg => {
                        const isOwn = msg.sender === user?.username;
                        const isAI = msg.msg_type === 'ai';
                        const isDeleted = msg.is_deleted;
                        const senderAvatar = isAI ? activeConv.agent_avatar : msg.sender_avatar;
                        const msgReactions = reactions[msg.msg_id] || [];
                        const isPinned = pinnedMsgs.has(msg.msg_id);
                        const isStarred = starredMsgs.has(msg.msg_id);
                        const isSelected = selectedMsgs.has(msg.msg_id);

                        return (
                          <div key={msg.msg_id} ref={el => { if (el) msgRefs.current[msg.msg_id] = el; }}
                            style={{ display:'flex', flexDirection:isOwn?'row-reverse':'row', gap:8, alignItems:'flex-end', marginBottom:2, padding:'1px 0', background:isSelected?'rgba(124,58,237,0.06)':'transparent', borderRadius:8, transition:'background 120ms', cursor:selectionMode?'pointer':'default' }}
                            onClick={selectionMode ? () => toggleSelectMsg(msg.msg_id) : undefined}
                            onContextMenu={e => { e.preventDefault(); if (!isDeleted) setMsgContextMenu({ msg, x:e.clientX, y:e.clientY }); }}>
                            
                            {/* Selection checkbox */}
                            {selectionMode && (
                              <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${isSelected?'#7c3aed':'#d1d5db'}`, background:isSelected?'#7c3aed':'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'center', marginRight:isOwn?0:4, marginLeft:isOwn?4:0, transition:'all 120ms' }}>
                                {isSelected && <Check size={11} color="white" strokeWidth={3} />}
                              </div>
                            )}

                            {/* Avatar */}
                            {!isOwn && (
                              <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:isAI?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.6875rem', fontWeight:700 }}>
                                {senderAvatar ? <img src={getAvatarUrl(senderAvatar)} alt={msg.sender} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => (e.target as HTMLImageElement).style.display='none'} /> : isAI ? <Bot size={14} /> : getInitials(msg.sender_full_name || msg.sender)}
                              </div>
                            )}

                            {/* Bubble + actions */}
                            <div style={{ display:'flex', flexDirection:'column', alignItems:isOwn?'flex-end':'flex-start', gap:2, maxWidth:'min(580px, 72%)', position:'relative' }}>
                              
                              {/* Reply preview */}
                              {msg.reply_to && msg.reply_content && (
                                <div onClick={() => scrollToMsg(msg.reply_to)}
                                  style={{ padding:'6px 10px', background:isOwn?'rgba(167,139,250,0.2)':'rgba(226,232,240,0.5)', borderRadius:10, borderLeft:'3px solid #7c3aed', fontSize:'0.75rem', color:'#6B7280', maxWidth:'100%', marginBottom:2, cursor:'pointer', transition:'background 120ms' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = isOwn?'rgba(167,139,250,0.3)':'rgba(226,232,240,0.7)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = isOwn?'rgba(167,139,250,0.2)':'rgba(226,232,240,0.5)')}>
                                  <div style={{ fontWeight:700, color:'#7c3aed', marginBottom:2, fontSize:'0.6875rem' }}>{msg.reply_sender_name || msg.reply_sender}</div>
                                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>{msg.reply_content}</div>
                                </div>
                              )}

                              {/* Main bubble */}
                              <div style={{ padding:isDeleted?'8px 14px':'10px 14px 7px', borderRadius:isOwn?'18px 18px 4px 18px':'18px 18px 18px 4px', background:isOwn?'linear-gradient(135deg, #A78BFA, #C4B5FD)':isAI?'#F0FDF4':'white', border:isOwn?'none':isAI?'1px solid rgba(16,185,129,0.2)':'1px solid rgba(226,232,240,0.7)', boxShadow:isOwn?'0 2px 10px rgba(167,139,250,0.22)':'0 1px 4px rgba(0,0,0,0.06)', position:'relative', display:'inline-block', width:'fit-content', maxWidth:'100%', outline:isPinned?'2px solid rgba(124,58,237,0.4)':'none', outlineOffset:2, opacity:isDeleted?0.6:1, transition:'all 120ms' }}>
                                
                                {/* Pinned indicator */}
                                {isPinned && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.625rem', color:'#7c3aed', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}><Pin size={9} /> Pinned</div>}
                                
                                {/* Starred indicator */}
                                {isStarred && <div style={{ position:'absolute', top:5, right:isOwn?10:8, fontSize:'0.7rem', lineHeight:1 }}>⭐</div>}
                                
                                {/* Group sender name */}
                                {!isOwn && activeConv.type === 'group' && <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#7c3aed', marginBottom:3 }}>{msg.sender_full_name || msg.sender}</div>}
                                
                                {/* AI badge */}
                                {isAI && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.625rem', color:'#059669', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}><Bot size={9} /> AI</div>}
                                
                                {/* Content */}
                                <div style={{ fontSize:'14.5px', lineHeight:1.55, color:'#1F2937', fontFamily:'DM Sans, sans-serif', wordBreak:'break-word', overflowWrap:'anywhere' }}>
                                  {isDeleted ? (
                                    <span style={{ color:'#9CA3AF', fontStyle:'italic', fontSize:'0.875rem' }}>🚫 This message was deleted</span>
                                  ) : (
                                    <MessageRenderer content={msg.content} msgType={msg.render_type || msg.msg_type} metadata={msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : undefined} voiceData={msg.voice_data ? (typeof msg.voice_data === 'string' ? JSON.parse(msg.voice_data) : msg.voice_data) : undefined} attachments={msg.attachments ? (typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments) : undefined} />
                                  )}
                                </div>
                                
                                {/* Meta row */}
                                {!isDeleted && (
                                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4, justifyContent:'flex-end' }}>
                                    {msg.is_edited === 1 && <span style={{ fontSize:'0.625rem', color:isOwn?'rgba(55,65,81,0.6)':'#9CA3AF', fontStyle:'italic' }}>edited</span>}
                                    <span style={{ fontSize:'0.6875rem', color:isOwn?'rgba(55,65,81,0.7)':'rgba(107,114,128,0.8)', fontWeight:500, whiteSpace:'nowrap' }}>
                                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                                    </span>
                                    {isOwn && <MsgStatus status={msg.status || 'sent'} />}
                                  </div>
                                )}
                              </div>

                              {/* Reactions */}
                              {msgReactions.length > 0 && (
                                <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:2 }}>
                                  {msgReactions.map(r => (
                                    <button key={r.emoji} onClick={() => reactToMessage(msg.msg_id, r.emoji)}
                                      style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 7px', background:r.hasReacted?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.9)', border:r.hasReacted?'1px solid rgba(59,130,246,0.35)':'1px solid rgba(226,232,240,0.8)', borderRadius:999, fontSize:'0.75rem', cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'#374151', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', transition:'all 120ms' }}
                                      title={r.users?.join(', ')}>
                                      {r.emoji} <span style={{ fontSize:'0.6875rem', fontWeight:700 }}>{r.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Quick action buttons (show on hover) */}
                              {!isDeleted && !selectionMode && (
                                <div className={styles.msgActions} style={{ display:'flex', gap:4, opacity:0, transition:'opacity 140ms', flexDirection:isOwn?'row-reverse':'row', position:'absolute', [isOwn?'left':'right']:-90, bottom:28, background:'white', border:'1px solid rgba(226,232,240,0.8)', borderRadius:20, padding:'3px 6px', boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}>
                                  <button onClick={e => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg.msg_id ? null : msg.msg_id); }} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280', transition:'all 100ms' }} title="React"><Smile size={13} /></button>
                                  <button onClick={() => setReplyTo(msg)} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280', transition:'all 100ms' }} title="Reply"><Reply size={13} /></button>
                                  <button onClick={() => setShowForwardModal(msg)} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280', transition:'all 100ms' }} title="Forward"><Forward size={13} /></button>
                                  <button onClick={e => { e.preventDefault(); setMsgContextMenu({ msg, x:e.clientX, y:e.clientY }); }} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280', transition:'all 100ms' }} title="More"><MoreVertical size={13} /></button>
                                </div>
                              )}

                              {/* Inline reaction picker */}
                              {showReactionPicker === msg.msg_id && (
                                <div onClick={e => e.stopPropagation()} style={{ position:'absolute', [isOwn?'right':'left']:0, bottom:'100%', marginBottom:6, display:'flex', gap:2, padding:'6px 10px', background:'white', border:'1px solid rgba(226,232,240,0.7)', borderRadius:999, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', zIndex:200, animation:'fadeInScale 120ms ease' }}>
                                  {QUICK_REACTIONS.map(emoji => (
                                    <button key={emoji} onClick={() => { reactToMessage(msg.msg_id, emoji); setShowReactionPicker(null); }}
                                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.25rem', padding:'2px 3px', borderRadius:6, transition:'transform 120ms', lineHeight:1 }}
                                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.35)')}
                                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {isTyping && (
                    <div className={styles.typing}>
                      <div className={`${styles.msgAvatar} ${styles.msgAvatarAI}`}><Bot size={14} /></div>
                      <div className={styles.typingDots}><div className={styles.typingDot} /><div className={styles.typingDot} /><div className={styles.typingDot} /></div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {showScrollButton && (
                  <button className={styles.scrollToBottom} onClick={scrollToBottom} title="Scroll to bottom"><ChevronDown size={20} /></button>
                )}

                {/* ── Reply preview bar ── */}
                {replyTo && (
                  <div style={{ padding:'8px 20px', background:'rgba(124,58,237,0.04)', borderTop:'1px solid rgba(124,58,237,0.15)', display:'flex', alignItems:'center', gap:10 }}>
                    <Reply size={14} style={{ color:'#7c3aed', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#7c3aed', fontFamily:'DM Sans, sans-serif' }}>Replying to {replyTo.sender}</div>
                      <div style={{ fontSize:'0.8125rem', color:'#6B7280', fontFamily:'DM Sans, sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.content}</div>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0 }}><X size={16} /></button>
                  </div>
                )}

                {/* ── Edit mode bar ── */}
                {editingMsg && (
                  <div style={{ padding:'8px 20px', background:'rgba(59,130,246,0.04)', borderTop:'1px solid rgba(59,130,246,0.15)', display:'flex', alignItems:'center', gap:10 }}>
                    <Edit2 size={14} style={{ color:'#3b82f6', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#3b82f6', fontFamily:'DM Sans, sans-serif' }}>Editing message</div>
                    </div>
                    <button onClick={() => { setEditingMsg(null); setEditContent(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0 }}><X size={16} /></button>
                  </div>
                )}

                {/* ── Composer ── */}
                <div className={styles.composer}>
                  {showFileUploader ? (
                    <FileUploader onUploadComplete={sendFileMessage} onCancel={() => setShowFileUploader(false)} />
                  ) : showVoiceRecorder ? (
                    <VoiceRecorder onRecordComplete={sendVoiceMessage} onCancel={() => setShowVoiceRecorder(false)} />
                  ) : editingMsg ? (
                    <>
                      <textarea ref={inputRef} className={styles.composerInput} value={editContent} rows={1} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { setEditingMsg(null); setEditContent(''); } }} autoFocus />
                      <button className={styles.sendBtn} onClick={saveEdit} style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)' }}><Check size={18} /></button>
                    </>
                  ) : (
                    <>
                      <div style={{ position:'relative' }}>
                        <button className={styles.attachBtn} onClick={e => { e.stopPropagation(); setShowAttachMenu(p => !p); }} title="Attach">
                          <Paperclip size={18} />
                        </button>
                        {showAttachMenu && (
                          <AttachmentMenu
                            onClose={() => setShowAttachMenu(false)}
                            onSelectFile={() => setShowFileUploader(true)}
                            onSelectPhoto={() => setShowFileUploader(true)}
                            onSelectVoice={() => setShowVoiceRecorder(true)}
                            onSelectPoll={() => showToast('Poll feature coming soon', 'info')}
                            onSelectContact={() => showToast('Contact share coming soon', 'info')}
                            onSelectEvent={() => showToast('Event feature coming soon', 'info')}
                            onQuickReply={() => showToast('Quick replies coming soon', 'info')}
                          />
                        )}
                      </div>
                      <textarea ref={inputRef} className={styles.composerInput} placeholder="Type a message..." value={input} rows={1} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                      <EmojiPicker onSelect={emoji => setInput(prev => prev + emoji)} />
                      <button className={styles.voiceBtn} onClick={() => setShowVoiceRecorder(true)} title="Voice Message"><Mic size={18} /></button>
                      <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={!input.trim() || sending}>
                        {sending ? <Loader2 size={18} className={styles.spinning} /> : <Send size={18} />}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {/* End Right Panel */}
        </div>
      </AppShell>

      {/* ══════════════════════════════════════════════════════════════════
          CONTEXT MENU
      ══════════════════════════════════════════════════════════════════ */}
      {msgContextMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position:'fixed', left:Math.min(msgContextMenu.x, window.innerWidth - 215), top:Math.min(msgContextMenu.y, window.innerHeight - 420), zIndex:9999, background:'white', border:'1px solid rgba(226,232,240,0.8)', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)', padding:'6px', minWidth:200, animation:'fadeInScale 120ms ease' }}>
          {/* Quick reactions at top */}
          <div style={{ display:'flex', gap:2, padding:'6px 8px 8px', borderBottom:'1px solid rgba(226,232,240,0.5)', marginBottom:4 }}>
            {QUICK_REACTIONS.slice(0, 6).map(emoji => (
              <button key={emoji} onClick={() => { reactToMessage(msgContextMenu.msg.msg_id, emoji); setMsgContextMenu(null); }}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.25rem', padding:'2px 4px', borderRadius:6, transition:'transform 120ms', lineHeight:1 }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {emoji}
              </button>
            ))}
          </div>

          {[
            { icon:<Reply size={14} />, label:'Reply', action:() => { setReplyTo(msgContextMenu.msg); setMsgContextMenu(null); } },
            { icon:<Copy size={14} />, label:'Copy', action:() => copyMessage(msgContextMenu.msg.content) },
            { icon:<Forward size={14} />, label:'Forward', action:() => { setShowForwardModal(msgContextMenu.msg); setMsgContextMenu(null); } },
            { icon:<Pin size={14} />, label:pinnedMsgs.has(msgContextMenu.msg.msg_id)?'Unpin':'Pin', action:() => pinMessage(msgContextMenu.msg) },
            { icon:<Star size={14} />, label:starredMsgs.has(msgContextMenu.msg.msg_id)?'Unstar':'Star', action:() => starMessage(msgContextMenu.msg) },
            { icon:<BookmarkPlus size={14} />, label:'Add to Note', action:() => { setShowNoteModal(msgContextMenu.msg); setMsgContextMenu(null); } },
            { icon:<CheckSquare size={14} />, label:'Select', action:() => { setSelectionMode(true); toggleSelectMsg(msgContextMenu.msg.msg_id); setMsgContextMenu(null); } },
            ...(msgContextMenu.msg.sender === user?.username ? [
              { icon:<Edit2 size={14} />, label:'Edit', action:() => { setEditingMsg(msgContextMenu.msg); setEditContent(msgContextMenu.msg.content); setMsgContextMenu(null); } },
              { icon:<Trash2 size={14} />, label:'Delete', action:() => deleteMessage(msgContextMenu.msg), danger:true },
            ] : [
              { icon:<Flag size={14} />, label:'Report', action:() => { showToast('Message reported', 'info'); setMsgContextMenu(null); }, danger:true },
            ]),
          ].map((item: any) => (
            <button key={item.label} onClick={item.action}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', borderRadius:8, cursor:'pointer', fontSize:'0.875rem', fontFamily:'DM Sans, sans-serif', color:item.danger?'#dc2626':'#374151', textAlign:'left', transition:'background 100ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = item.danger?'rgba(239,68,68,0.06)':'#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ color:item.danger?'#dc2626':'#6B7280', flexShrink:0 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NEW CHAT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showNewChat && (
        <NewChatModal
          user={user}
          agents={agents}
          onClose={() => setShowNewChat(false)}
          onCreated={async (convId, conv) => {
            setShowNewChat(false);
            await loadConversations();
            if (convId) openConversation(conv || { conv_id:convId });
          }}
          showToast={showToast}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FORWARD MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showForwardModal && (
        <div onClick={() => setShowForwardModal(null)} style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(15,23,42,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:24, width:'min(420px, 90vw)', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', animation:'fadeIn 150ms ease' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:'1rem', fontWeight:700, color:'#111827', fontFamily:'DM Sans, sans-serif' }}>Forward Message</span>
              <button onClick={() => setShowForwardModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:4 }}><X size={18} /></button>
            </div>
            <div style={{ padding:'10px 14px', background:'#F9FAFB', borderRadius:10, marginBottom:16, fontSize:'0.875rem', color:'#374151', fontFamily:'DM Sans, sans-serif', borderLeft:'3px solid #7c3aed', maxHeight:80, overflow:'hidden', textOverflow:'ellipsis' }}>
              {showForwardModal.content}
            </div>
            <div style={{ fontSize:'0.8125rem', fontWeight:600, color:'#6B7280', marginBottom:10, fontFamily:'DM Sans, sans-serif' }}>Select conversation:</div>
            <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
              {conversations.filter(c => c.conv_id !== activeConv?.conv_id).map(conv => {
                const name = getConvDisplayName(conv);
                return (
                  <button key={conv.conv_id} onClick={() => forwardMessage(conv.conv_id)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, border:'1px solid rgba(226,232,240,0.6)', background:'white', cursor:'pointer', textAlign:'left', transition:'all 140ms', fontFamily:'DM Sans, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <ConvAvatar src={conv.direct_avatar || conv.agent_avatar} name={name} size={36} type={conv.type as any} />
                    <div>
                      <div style={{ fontSize:'0.875rem', fontWeight:600, color:'#111827' }}>{name}</div>
                      <div style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>{conv.type === 'group' ? 'Group' : conv.type === 'direct' ? 'Direct' : 'AI'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD TO NOTE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showNoteModal && (
        <div onClick={() => setShowNoteModal(null)} style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(15,23,42,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:24, width:'min(420px, 90vw)', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', animation:'fadeIn 150ms ease' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:'1rem', fontWeight:700, color:'#111827', fontFamily:'DM Sans, sans-serif' }}>Add to Note</span>
              <button onClick={() => setShowNoteModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:4 }}><X size={18} /></button>
            </div>
            <div style={{ padding:'10px 14px', background:'#F9FAFB', borderRadius:10, marginBottom:16, fontSize:'0.875rem', color:'#374151', fontFamily:'DM Sans, sans-serif', borderLeft:'3px solid #7c3aed', maxHeight:80, overflow:'hidden', textOverflow:'ellipsis' }}>
              {showNoteModal.content}
            </div>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add your notes..." rows={4}
              style={{ width:'100%', padding:'10px 14px', border:'1px solid rgba(226,232,240,0.7)', borderRadius:10, fontSize:'0.875rem', fontFamily:'DM Sans, sans-serif', outline:'none', resize:'none', boxSizing:'border-box', marginBottom:12 }} />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowNoteModal(null)} style={{ flex:1, padding:'10px', border:'1px solid rgba(226,232,240,0.7)', borderRadius:10, background:'white', color:'#374151', fontSize:'0.875rem', fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => { showToast('Note saved!', 'success'); setShowNoteModal(null); setNoteContent(''); }} style={{ flex:1, padding:'10px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6366f1)', color:'white', fontSize:'0.875rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Save size={14} /> Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CHAT INFO PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {showInfoPanel && activeConv && (
        <ChatInfoPanel
          conv={activeConv}
          user={user}
          pinnedMsgs={pinnedMsgs}
          starredMsgs={starredMsgs}
          messages={messages}
          onClose={() => setShowInfoPanel(false)}
          onClearChat={clearChat}
          onDeleteChat={() => { if (confirm('Delete this chat?')) { setActiveConv(null); setShowInfoPanel(false); showToast('Chat deleted', 'info'); } }}
          onMuteToggle={handleMuteToggle}
          isMuted={isMuted}
          showToast={showToast}
          getConvDisplayName={getConvDisplayName}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AI AGENT PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {showAIPanel && activeAgent && (
        <AIAgentPanel
          agent={activeAgent}
          conv={activeConv}
          onClose={() => setShowAIPanel(false)}
          onSendCommand={cmd => { setInput(cmd); setShowAIPanel(false); inputRef.current?.focus(); }}
          onUpdateAgent={(agentId, data) => {
            setAgents(prev => prev.map(a => a.agent_id === agentId ? { ...a, ...data } : a));
            if (activeConv?.agent_id === agentId) setActiveConv((prev: any) => ({ ...prev, agent_name:data.name }));
          }}
          showToast={showToast}
        />
      )}

      <MobileHeader title="Chat" user={user} onLogout={handleLogout} hidden={isMobile && showMobileChat} />
      <BottomNav activeTab="chat" onTabChange={nav} hidden={isMobile && showMobileChat} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE SESSIONS BOTTOM SHEET
      ══════════════════════════════════════════════════════════════════ */}
      {isMobile && isAIConv && showSessionsSidebar && activeConv && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            animation: 'fadeIn 200ms ease'
          }}
          onClick={() => setShowSessionsSidebar(false)}
        >
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '70vh',
              background: 'white',
              borderRadius: '20px 20px 0 0',
              animation: 'slideUp 200ms ease',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <ChatSessionsSidebar
              convId={activeConv.conv_id}
              activeSessionId={activeSessionId}
              onSessionSelect={(sessionId) => {
                setActiveSessionId(sessionId);
                setShowSessionsSidebar(false);
                loadMessages(activeConv.conv_id);
              }}
              onNewSession={async () => {
                try {
                  const res = await fetch('/api/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      convId: activeConv.conv_id, 
                      title: 'New Chat' 
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setActiveSessionId(data.sessionId);
                    setMessages([]);
                    setShowSessionsSidebar(false);
                    showToast('New chat session created', 'success');
                  }
                } catch (error) {
                  showToast('Failed to create session', 'error');
                }
              }}
              isMobile
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .${styles.msgRow}:hover .${styles.msgActions} {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
