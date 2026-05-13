'use client';

import { Bot } from 'lucide-react';
import styles from './TypingIndicator.module.css';

interface TypingIndicatorProps {
  username?: string;
  isAI?: boolean;
}

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function TypingIndicator({ username, isAI = false }: TypingIndicatorProps) {
  return (
    <div className={styles.typing}>
      <div className={`${styles.avatar} ${isAI ? styles.avatarAI : ''}`}>
        {isAI ? <Bot size={14} /> : getInitials(username || 'User')}
      </div>
      <div className={styles.typingDots}>
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
      </div>
    </div>
  );
}
