'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import styles from './ReactionButtons.module.css';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface ReactionButtonsProps {
  msgId: string;
  reactions: Reaction[];
  currentUser: string;
  onReactionToggle: (msgId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ReactionButtons({ msgId, reactions, currentUser, onReactionToggle }: ReactionButtonsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = (emoji: string) => {
    onReactionToggle(msgId, emoji);
  };

  return (
    <div className={styles.reactions}>
      {reactions.map((reaction, idx) => (
        <button
          key={idx}
          className={`${styles.reaction} ${reaction.hasReacted ? styles.reactionActive : ''}`}
          onClick={() => handleReactionClick(reaction.emoji)}
          title={reaction.users.join(', ')}
        >
          <span className={styles.reactionEmoji}>{reaction.emoji}</span>
          <span className={styles.reactionCount}>{reaction.count}</span>
        </button>
      ))}

      <div className={styles.addReaction}>
        <button
          className={styles.addReactionBtn}
          onClick={() => setShowPicker(!showPicker)}
          title="Add Reaction"
        >
          <Plus size={14} />
        </button>

        {showPicker && (
          <>
            <div className={styles.pickerBackdrop} onClick={() => setShowPicker(false)} />
            <div className={styles.quickPicker}>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={styles.quickEmoji}
                  onClick={() => {
                    handleReactionClick(emoji);
                    setShowPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
