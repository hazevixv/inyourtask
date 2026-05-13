'use client';

import { useEffect, useState } from 'react';
import { Smile } from 'lucide-react';
import styles from './EmojiPicker.module.css';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🎮', '🎯'],
};

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.emojiPicker}>
      <button 
        className={styles.emojiBtn}
        onClick={() => setShowPicker(!showPicker)}
        title="Add Emoji"
      >
        <Smile size={18} />
      </button>

      {showPicker && (
        <>
          <div className={styles.pickerBackdrop} onClick={() => setShowPicker(false)} />
          <div className={styles.pickerContainer}>
            <div className={styles.pickerHeader}>
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryBtn} ${activeCategory === category ? styles.categoryBtnActive : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className={styles.emojiGrid}>
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, idx) => (
                <button
                  key={idx}
                  className={styles.emojiItem}
                  onClick={() => {
                    onSelect(emoji);
                    setShowPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
