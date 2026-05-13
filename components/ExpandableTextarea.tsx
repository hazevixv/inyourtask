'use client';

import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import styles from './ExpandableTextarea.module.css';

interface ExpandableTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ReactNode;
  aiEnhanceButton?: React.ReactNode;
}

export default function ExpandableTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  icon,
  aiEnhanceButton
}: ExpandableTextareaProps) {
  const [expanded, setExpanded] = useState(false);

  const renderContent = (text: string) => {
    if (!text) return <span className={styles.placeholder}>{placeholder}</span>;
    
    // Simple markdown-like rendering
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold: **text** or __text__
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      // Italic: *text* or _text_
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
      processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Links: [text](url)
      processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      // Bullet points: - text or * text
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        processed = '<li>' + processed.substring(2) + '</li>';
      }
      
      return (
        <div key={i} dangerouslySetInnerHTML={{ __html: processed }} />
      );
    });
  };

  return (
    <>
      <div className={styles.container}>
        <label>
          <span className={styles.labelText}>
            {icon}
            {label}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {aiEnhanceButton}
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setExpanded(true)}
              title="Expand to full view"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      </div>

      {expanded && (
        <div className={styles.modal} onClick={() => setExpanded(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{label}</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setExpanded(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.editorSection}>
                <div className={styles.sectionLabel}>Edit</div>
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  rows={15}
                  placeholder={placeholder}
                  autoFocus
                />
              </div>
              
              <div className={styles.previewSection}>
                <div className={styles.sectionLabel}>Preview</div>
                <div className={styles.preview}>
                  {renderContent(value)}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <div className={styles.hint}>
                Supports: **bold**, *italic*, [link](url), - bullet points
              </div>
              <button
                type="button"
                className={styles.doneBtn}
                onClick={() => setExpanded(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
