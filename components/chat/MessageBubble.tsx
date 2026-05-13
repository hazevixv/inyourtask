'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Reply, Copy, Forward, Pin, Star, Edit2, Trash2, Smile,
  Check, CheckCheck, Clock, AlertCircle, MoreHorizontal,
  FileText, Download, Play, Pause, Volume2, Bot, Users,
  BookmarkPlus, Bell, BellOff, Flag, Share2
} from 'lucide-react';
import MessageRenderer from './MessageRenderer';
import { getAvatarUrl } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function MsgStatus({ status }: { status?: string }) {
  if (!status || status === 'sending') return <Clock size={11} style={{ color: 'rgba(107,114,128,0.7)' }} />;
  if (status === 'sent') return <Check size={11} style={{ color: 'rgba(107,114,128,0.8)' }} />;
  if (status === 'delivered') return <CheckCheck size={11} style={{ color: 'rgba(107,114,128,0.8)' }} />;
  if (status === 'read') return <CheckCheck size={11} style={{ color: '#3b82f6' }} />;
  if (status === 'failed') return <AlertCircle size={11} style={{ color: '#ef4444' }} />;
  return null;
}

interface MessageBubbleProps {
  msg: any;
  isOwn: boolean;
  isAI: boolean;
  isGroup: boolean;
  activeConvType: string;
  user: any;
  reactions: any[];
  pinnedMsgs: Set<string>;
  starredMsgs: Set<string>;
  selectedMsgs: Set<string>;
  selectionMode: boolean;
  onReply: (msg: any) => void;
  onEdit: (msg: any) => void;
  onDelete: (msg: any) => void;
  onCopy: (content: string) => void;
  onForward: (msg: any) => void;
  onPin: (msg: any) => void;
  onStar: (msg: any) => void;
  onReact: (msgId: string, emoji: string) => void;
  onSelect: (msgId: string) => void;
  onAddNote: (msg: any) => void;
  onScrollToReply?: (msgId: string) => void;
  agentAvatar?: string | null;
  agentType?: string;
}

export default function MessageBubble({
  msg, isOwn, isAI, isGroup, activeConvType, user,
  reactions, pinnedMsgs, starredMsgs, selectedMsgs, selectionMode,
  onReply, onEdit, onDelete, onCopy, onForward, onPin, onStar, onReact,
  onSelect, onAddNote, onScrollToReply, agentAvatar, agentType
}: MessageBubbleProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showHoverActions, setShowHoverActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDeleted = msg.is_deleted;
  const isPinned = pinnedMsgs.has(msg.msg_id);
  const isStarred = starredMsgs.has(msg.msg_id);
  const isSelected = selectedMsgs.has(msg.msg_id);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
        setShowReactionPicker(false);
      }
    };
    if (showContextMenu || showReactionPicker) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showContextMenu, showReactionPicker]);

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleted) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX;
    let y = e.clientY;
    if (x + 210 > vw) x = vw - 215;
    if (y + 380 > vh) y = vh - 385;
    setMenuPos({ x, y });
    setShowContextMenu(true);
    setShowReactionPicker(false);
  };

  const handleLongPress = (() => {
    let timer: ReturnType<typeof setTimeout>;
    return {
      onTouchStart: (e: React.TouchEvent) => {
        timer = setTimeout(() => {
          const touch = e.touches[0];
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let x = touch.clientX;
          let y = touch.clientY;
          if (x + 210 > vw) x = vw - 215;
          if (y + 380 > vh) y = vh - 385;
          setMenuPos({ x, y });
          setShowContextMenu(true);
        }, 500);
      },
      onTouchEnd: () => clearTimeout(timer),
      onTouchMove: () => clearTimeout(timer),
    };
  })();

  const senderAvatar = isAI ? agentAvatar : msg.sender_avatar;
  const senderName = msg.sender_full_name || msg.sender;

  const bubbleBg = isOwn
    ? 'linear-gradient(135deg, #A78BFA, #C4B5FD)'
    : isAI
      ? (agentType === 'ai_personal' ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)')
      : 'white';

  const bubbleBorder = isOwn
    ? 'none'
    : isAI
      ? '1px solid rgba(16,185,129,0.2)'
      : '1px solid rgba(226,232,240,0.7)';

  const bubbleRadius = isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px';

  const menuItems = [
    { icon: <Smile size={15} />, label: 'React', action: () => { setShowContextMenu(false); setShowReactionPicker(true); } },
    { icon: <Reply size={15} />, label: 'Reply', action: () => { onReply(msg); setShowContextMenu(false); } },
    { icon: <Copy size={15} />, label: 'Copy', action: () => { onCopy(msg.content); setShowContextMenu(false); } },
    { icon: <Forward size={15} />, label: 'Forward', action: () => { onForward(msg); setShowContextMenu(false); } },
    { icon: <Pin size={15} />, label: isPinned ? 'Unpin' : 'Pin', action: () => { onPin(msg); setShowContextMenu(false); } },
    { icon: <Star size={15} />, label: isStarred ? 'Unstar' : 'Star', action: () => { onStar(msg); setShowContextMenu(false); } },
    { icon: <BookmarkPlus size={15} />, label: 'Add to Note', action: () => { onAddNote(msg); setShowContextMenu(false); } },
    { icon: <Check size={15} />, label: 'Select', action: () => { onSelect(msg.msg_id); setShowContextMenu(false); } },
    ...(isOwn ? [
      { icon: <Edit2 size={15} />, label: 'Edit', action: () => { onEdit(msg); setShowContextMenu(false); } },
      { icon: <Trash2 size={15} />, label: 'Delete', action: () => { onDelete(msg); setShowContextMenu(false); }, danger: true },
    ] : [
      { icon: <Flag size={15} />, label: 'Report', action: () => { setShowContextMenu(false); }, danger: true },
    ]),
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-end',
        marginBottom: 2,
        padding: '1px 0',
        background: isSelected ? 'rgba(124,58,237,0.06)' : 'transparent',
        borderRadius: 8,
        transition: 'background 120ms',
        cursor: selectionMode ? 'pointer' : 'default',
      }}
      onClick={selectionMode ? () => onSelect(msg.msg_id) : undefined}
      onContextMenu={openContextMenu}
      onMouseEnter={() => setShowHoverActions(true)}
      onMouseLeave={() => setShowHoverActions(false)}
      {...handleLongPress}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `2px solid ${isSelected ? '#7c3aed' : '#d1d5db'}`,
          background: isSelected ? '#7c3aed' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, alignSelf: 'center', marginRight: isOwn ? 0 : 4, marginLeft: isOwn ? 4 : 0,
          transition: 'all 120ms',
        }}>
          {isSelected && <Check size={11} color="white" strokeWidth={3} />}
        </div>
      )}

      {/* Avatar */}
      {!isOwn && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: isAI ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6875rem', fontWeight: 700 }}>
          {senderAvatar ? (
            <img src={getAvatarUrl(senderAvatar)} alt={senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : isAI ? (
            <Bot size={14} />
          ) : (
            getInitials(senderName)
          )}
        </div>
      )}

      {/* Bubble + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2, maxWidth: 'min(580px, 72%)', position: 'relative' }}>

        {/* Hover quick actions */}
        {!isDeleted && !selectionMode && showHoverActions && (
          <div style={{
            position: 'absolute',
            [isOwn ? 'left' : 'right']: -90,
            bottom: 28,
            display: 'flex',
            gap: 3,
            zIndex: 10,
            background: 'white',
            border: '1px solid rgba(226,232,240,0.8)',
            borderRadius: 20,
            padding: '3px 6px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            animation: 'fadeInScale 100ms ease',
          }}>
            {[
              { icon: <Smile size={13} />, title: 'React', action: () => setShowReactionPicker(p => !p) },
              { icon: <Reply size={13} />, title: 'Reply', action: () => onReply(msg) },
              { icon: <Forward size={13} />, title: 'Forward', action: () => onForward(msg) },
              { icon: <MoreHorizontal size={13} />, title: 'More', action: (e: React.MouseEvent) => openContextMenu(e) },
            ].map(item => (
              <button key={item.title} title={item.title} onClick={e => { e.stopPropagation(); item.action(e as any); }}
                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', transition: 'all 100ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280'; }}>
                {item.icon}
              </button>
            ))}
          </div>
        )}

        {/* Inline reaction picker */}
        {showReactionPicker && (
          <div ref={menuRef} onClick={e => e.stopPropagation()} style={{
            position: 'absolute',
            [isOwn ? 'right' : 'left']: 0,
            bottom: '100%',
            marginBottom: 6,
            display: 'flex',
            gap: 2,
            padding: '6px 10px',
            background: 'white',
            border: '1px solid rgba(226,232,240,0.7)',
            borderRadius: 999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 200,
            animation: 'fadeInScale 120ms ease',
          }}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(msg.msg_id, emoji); setShowReactionPicker(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '2px 3px', borderRadius: 6, transition: 'transform 120ms', lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.35)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && msg.reply_content && (
          <div
            onClick={() => onScrollToReply?.(msg.reply_to)}
            style={{
              padding: '6px 10px',
              background: isOwn ? 'rgba(167,139,250,0.2)' : 'rgba(226,232,240,0.5)',
              borderRadius: 10,
              borderLeft: '3px solid #7c3aed',
              fontSize: '0.75rem',
              color: '#6B7280',
              maxWidth: '100%',
              marginBottom: 2,
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isOwn ? 'rgba(167,139,250,0.3)' : 'rgba(226,232,240,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.background = isOwn ? 'rgba(167,139,250,0.2)' : 'rgba(226,232,240,0.5)')}
          >
            <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 2, fontSize: '0.6875rem' }}>{msg.reply_sender_name || msg.reply_sender}</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{msg.reply_content}</div>
          </div>
        )}

        {/* Main bubble */}
        <div
          ref={bubbleRef}
          style={{
            padding: isDeleted ? '8px 14px' : '10px 14px 7px',
            borderRadius: bubbleRadius,
            background: bubbleBg,
            border: bubbleBorder,
            boxShadow: isOwn ? '0 2px 10px rgba(167,139,250,0.22)' : '0 1px 4px rgba(0,0,0,0.06)',
            position: 'relative',
            display: 'inline-block',
            width: 'fit-content',
            maxWidth: '100%',
            outline: isPinned ? '2px solid rgba(124,58,237,0.4)' : 'none',
            outlineOffset: 2,
            opacity: isDeleted ? 0.6 : 1,
            transition: 'all 120ms',
          }}
        >
          {/* Pinned indicator */}
          {isPinned && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: '#7c3aed', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Pin size={9} /> Pinned
            </div>
          )}

          {/* Starred indicator */}
          {isStarred && (
            <div style={{ position: 'absolute', top: 5, right: isOwn ? 10 : 8, fontSize: '0.7rem', lineHeight: 1 }}>⭐</div>
          )}

          {/* Group sender name */}
          {!isOwn && isGroup && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginBottom: 3, fontFamily: 'DM Sans, sans-serif' }}>
              {senderName}
            </div>
          )}

          {/* AI badge */}
          {isAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: '#059669', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Bot size={9} /> AI
            </div>
          )}

          {/* Content */}
          <div style={{ fontSize: '14.5px', lineHeight: 1.55, color: isOwn ? '#1F2937' : '#1F2937', fontFamily: 'DM Sans, sans-serif', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {isDeleted ? (
              <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.875rem' }}>🚫 This message was deleted</span>
            ) : (
              <MessageRenderer
                content={msg.content}
                msgType={msg.render_type || msg.msg_type}
                metadata={msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : undefined}
                voiceData={msg.voice_data ? (typeof msg.voice_data === 'string' ? JSON.parse(msg.voice_data) : msg.voice_data) : undefined}
                attachments={msg.attachments ? (typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments) : undefined}
              />
            )}
          </div>

          {/* Meta row */}
          {!isDeleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
              {msg.is_edited === 1 && <span style={{ fontSize: '0.625rem', color: isOwn ? 'rgba(55,65,81,0.6)' : '#9CA3AF', fontStyle: 'italic' }}>edited</span>}
              <span style={{ fontSize: '0.6875rem', color: isOwn ? 'rgba(55,65,81,0.7)' : 'rgba(107,114,128,0.8)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isOwn && <MsgStatus status={msg.status || 'sent'} />}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
            {reactions.map(r => (
              <button key={r.emoji} onClick={() => onReact(msg.msg_id, r.emoji)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 7px',
                  background: r.hasReacted ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.9)',
                  border: r.hasReacted ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(226,232,240,0.8)',
                  borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', color: '#374151',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 120ms',
                }}
                title={r.users?.join(', ')}
              >
                {r.emoji} <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu Portal */}
      {showContextMenu && (
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: menuPos.x,
            top: menuPos.y,
            zIndex: 9999,
            background: 'white',
            border: '1px solid rgba(226,232,240,0.8)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            padding: '6px',
            minWidth: 200,
            animation: 'fadeInScale 120ms ease',
          }}
        >
          {/* Quick reactions at top */}
          <div style={{ display: 'flex', gap: 2, padding: '6px 8px 8px', borderBottom: '1px solid rgba(226,232,240,0.5)', marginBottom: 4 }}>
            {QUICK_REACTIONS.slice(0, 6).map(emoji => (
              <button key={emoji} onClick={() => { onReact(msg.msg_id, emoji); setShowContextMenu(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '2px 4px', borderRadius: 6, transition: 'transform 120ms', lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {emoji}
              </button>
            ))}
          </div>

          {menuItems.map((item: any, i) => (
            <button key={item.label} onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                background: 'none', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: item.danger ? '#dc2626' : '#374151',
                textAlign: 'left', transition: 'background 100ms',
                ...(i === menuItems.length - 1 && item.danger ? { marginTop: 4, borderTop: '1px solid rgba(226,232,240,0.5)', paddingTop: 10 } : {}),
              }}
              onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.06)' : '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ color: item.danger ? '#dc2626' : '#6B7280', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
