import { Plus, FileText, Briefcase, X } from 'lucide-react';
import { useState } from 'react';
import styles from './FAB.module.css';

interface FABProps {
  onNewTask: () => void;
  onNewProject: () => void;
}

export default function FAB({ onNewTask, onNewProject }: FABProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleTaskClick = () => {
    onNewTask();
    setMenuOpen(false);
  };

  const handleProjectClick = () => {
    onNewProject();
    setMenuOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div className={styles.fabBackdrop} onClick={() => setMenuOpen(false)} />
      )}

      {/* Menu Items */}
      {menuOpen && (
        <div className={styles.fabMenu}>
          <button className={styles.fabMenuItem} onClick={handleTaskClick}>
            <div className={styles.fabMenuIcon} style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <FileText size={18} style={{ color: '#10b981' }} />
            </div>
            <span className={styles.fabMenuLabel}>New Task</span>
          </button>
          <button className={styles.fabMenuItem} onClick={handleProjectClick}>
            <div className={styles.fabMenuIcon} style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
              <Briefcase size={18} style={{ color: '#7c3aed' }} />
            </div>
            <span className={styles.fabMenuLabel}>New Project</span>
          </button>
        </div>
      )}

      {/* Main FAB Button */}
      <button 
        className={`${styles.fab} ${menuOpen ? styles.fabOpen : ''}`} 
        onClick={toggleMenu}
      >
        {menuOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </>
  );
}
