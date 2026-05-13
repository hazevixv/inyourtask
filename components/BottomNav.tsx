import { LayoutGrid, FolderOpen, CheckSquare, MessageCircle } from 'lucide-react';
import SettingsMenu from './SettingsMenu';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hidden?: boolean;
}

export default function BottomNav({ activeTab, onTabChange, hidden }: BottomNavProps) {
  const items = [
    { id: 'overview',  label: 'Home',     icon: LayoutGrid },
    { id: 'tasks',     label: 'Tasks',    icon: CheckSquare },
    { id: 'projects',  label: 'Projects', icon: FolderOpen },
    { id: 'chat',      label: 'Chat',     icon: MessageCircle },
  ];
  if (hidden) return null;

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <SettingsMenu variant="bottom" />
    </nav>
  );
}
