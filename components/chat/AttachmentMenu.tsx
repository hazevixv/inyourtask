'use client';

import { useRef } from 'react';
import {
  FileText, Image, Camera, Mic, User, BarChart2,
  Calendar, Sticker, BookOpen, Zap, X
} from 'lucide-react';

interface AttachmentMenuProps {
  onClose: () => void;
  onSelectFile: () => void;
  onSelectPhoto: () => void;
  onSelectVoice: () => void;
  onSelectPoll?: () => void;
  onSelectContact?: () => void;
  onSelectEvent?: () => void;
  onQuickReply?: () => void;
}

const MENU_ITEMS = [
  { icon: <FileText size={20} />, label: 'Document', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', key: 'file' },
  { icon: <Image size={20} />, label: 'Photos & Videos', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', key: 'photo' },
  { icon: <Camera size={20} />, label: 'Camera', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', key: 'camera' },
  { icon: <Mic size={20} />, label: 'Audio', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', key: 'voice' },
  { icon: <User size={20} />, label: 'Contact', color: '#10b981', bg: 'rgba(16,185,129,0.12)', key: 'contact' },
  { icon: <BarChart2 size={20} />, label: 'Poll', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', key: 'poll' },
  { icon: <Calendar size={20} />, label: 'Event', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', key: 'event' },
  { icon: <Sticker size={20} />, label: 'Sticker', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', key: 'sticker' },
  { icon: <BookOpen size={20} />, label: 'Catalogue', color: '#84cc16', bg: 'rgba(132,204,22,0.12)', key: 'catalogue' },
  { icon: <Zap size={20} />, label: 'Quick Replies', color: '#f97316', bg: 'rgba(249,115,22,0.12)', key: 'quick' },
];

export default function AttachmentMenu({ onClose, onSelectFile, onSelectPhoto, onSelectVoice, onSelectPoll, onSelectContact, onSelectEvent, onQuickReply }: AttachmentMenuProps) {
  const actionMap: Record<string, () => void> = {
    file: onSelectFile,
    photo: onSelectPhoto,
    camera: onSelectPhoto,
    voice: onSelectVoice,
    poll: onSelectPoll || (() => {}),
    contact: onSelectContact || (() => {}),
    event: onSelectEvent || (() => {}),
    sticker: () => {},
    catalogue: () => {},
    quick: onQuickReply || (() => {}),
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: 8,
      background: 'white',
      border: '1px solid rgba(226,232,240,0.8)',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      padding: '8px',
      width: 220,
      zIndex: 200,
      animation: 'fadeInScale 150ms ease',
    }}>
      {MENU_ITEMS.map(item => (
        <button key={item.key} onClick={() => { actionMap[item.key]?.(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '10px 12px',
            border: 'none', borderRadius: 10, background: 'none',
            cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
            {item.icon}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
