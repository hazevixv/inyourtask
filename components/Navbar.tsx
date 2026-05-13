import { BrainCircuit, FolderKanban, LayoutGrid, LogOut, RefreshCw, Sparkles, CheckSquare, Activity, Plus, UserRound } from 'lucide-react';
import styles from './Navbar.module.css';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  onOpenModal: (type: 'task' | 'project') => void;
  user?: any;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, onTabChange, onRefresh, onOpenModal, user, onLogout }: NavbarProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'tracking', label: 'Tracking', icon: Activity },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'brain', label: 'Settings', icon: BrainCircuit },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <button className={styles.brand} onClick={() => onTabChange('overview')}>
          <span className={styles.brandMark} />
          <span>inyourtask</span>
        </button>

        <div className={styles.tabs}>
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          {user ? (
            <div className={styles.userInfo}>
              <span className={styles.userAvatar}>
                <UserRound size={14} />
              </span>
              <div>
                <div className={styles.userName}>{user.full_name || user.username}</div>
                <div className={styles.userRole}>{user.role}</div>
              </div>
            </div>
          ) : null}

          <button className={styles.btnSuccess} onClick={() => onOpenModal('task')}>
            <Plus size={13} />
            <span>Task</span>
          </button>
          <button className={styles.btnPrimary} onClick={() => onOpenModal('project')}>
            <Plus size={13} />
            <span>Project</span>
          </button>
          <button className={styles.iconBtn} onClick={onRefresh} title="Refresh data">
            <RefreshCw size={13} />
          </button>
          {onLogout ? (
            <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
              <LogOut size={13} />
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
