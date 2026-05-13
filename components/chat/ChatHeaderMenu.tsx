'use client';

import {
  Info, Search, CheckSquare, BellOff, Bell, Clock,
  Heart, X, Flag, UserX, Trash2, MessageSquare, Video
} from 'lucide-react';

interface ChatHeaderMenuProps {
  onClose: () => void;
  onContactInfo: () => void;
  onSearch: () => void;
  onSelectMessages: () => void;
  onMuteToggle: () => void;
  onDisappearing: () => void;
  onFavourite: () => void;
  onReport: () => void;
  onBlock: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  isMuted: boolean;
  isFavourite: boolean;
  convType: string;
}

export default function ChatHeaderMenu({
  onClose, onContactInfo, onSearch, onSelectMessages,
  onMuteToggle, onDisappearing, onFavourite, onReport,
  onBlock, onClearChat, onDeleteChat, isMuted, isFavourite, convType
}: ChatHeaderMenuProps) {
  const isAI = convType === 'ai_agent' || convType === 'ai_personal';

  const items = [
    { icon: <Info size={15} />, label: 'Contact info', action: onContactInfo },
    { icon: <Search size={15} />, label: 'Search', action: onSearch },
    { icon: <CheckSquare size={15} />, label: 'Select messages', action: onSelectMessages },
    ...(!isAI ? [
      { icon: isMuted ? <Bell size={15} /> : <BellOff size={15} />, label: isMuted ? 'Unmute notifications' : 'Mute notifications', action: onMuteToggle },
      { icon: <Clock size={15} />, label: 'Disappearing messages', action: onDisappearing },
      { icon: <Heart size={15} />, label: isFavourite ? 'Remove from favourites' : 'Add to favourites', action: onFavourite },
    ] : []),
    { divider: true },
    ...(!isAI ? [
      { icon: <Flag size={15} />, label: 'Report', action: onReport, danger: true },
      { icon: <UserX size={15} />, label: 'Block', action: onBlock, danger: true },
    ] : []),
    { icon: <Trash2 size={15} />, label: 'Clear chat', action: onClearChat, danger: true },
    { icon: <X size={15} />, label: convType === 'group' ? 'Leave group' : 'Delete chat', action: onDeleteChat, danger: true },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 4,
      background: 'white',
      border: '1px solid rgba(226,232,240,0.8)',
      borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      padding: '6px',
      minWidth: 220,
      zIndex: 300,
      animation: 'fadeInScale 120ms ease',
    }} onClick={e => e.stopPropagation()}>
      {items.map((item: any, i) => item.divider ? (
        <div key={i} style={{ height: 1, background: 'rgba(226,232,240,0.6)', margin: '4px 0' }} />
      ) : (
        <button key={item.label} onClick={() => { item.action(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 12px',
            border: 'none', borderRadius: 8, background: 'none',
            cursor: 'pointer', fontSize: '0.875rem',
            fontFamily: 'DM Sans, sans-serif',
            color: item.danger ? '#dc2626' : '#374151',
            textAlign: 'left', transition: 'background 100ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.06)' : '#F9FAFB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <span style={{ color: item.danger ? '#dc2626' : '#6B7280', flexShrink: 0 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
