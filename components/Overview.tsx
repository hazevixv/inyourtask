'use client';

import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS,
  Legend, LinearScale, Tooltip, LineElement, PointElement, Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  AlertTriangle, ArrowRight, Briefcase, CalendarClock, CheckCircle2,
  Clock3, Flame, Gauge, ListTodo, MessageCircle, Sparkles, TrendingUp, User, Zap, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useState } from 'react';
import styles from './Overview.module.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler);

interface OverviewProps { data: any; user?: any; }

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: '#ef4444', High: '#f97316', Normal: '#7c3aed', Low: '#10b981', Recurring: '#6366f1'
};
const STATUS_COLOR: Record<string, string> = {
  Backlog: '#94a3b8', 'Minggu Ini': '#f59e0b', 'In Progress': '#3b82f6',
  'On Hold': '#f97316', Done: '#10b981', Closed: '#64748b'
};

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function formatDue(date: any) {
  if (!date) return null;
  try { return format(new Date(date), 'dd MMM'); } catch { return null; }
}

export default function Overview({ data, user }: OverviewProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'project' | 'task'>('all');
  const [myWorkFilter, setMyWorkFilter] = useState(false); // New: My Work filter
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'week' | 'month'>('all'); // New: Calendar filter

  if (!data) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:'12px' }}>
        <div style={{ width:'32px', height:'32px', border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <p style={{ color:'var(--tx4)', fontSize:'0.875rem' }}>Loading dashboard...</p>
      </div>
    );
  }

  const { stats, projects, tasks, myTasks = [], byStatus, byPriority, byCategory, weeklyProgress = [] } = data;

  // ═══════════════════════════════════════════════════════════
  // POWERFUL FILTERING LOGIC - Affects ALL data in overview
  // ═══════════════════════════════════════════════════════════
  
  // Get current user info
  const currentUser = user?.username || user?.full_name || '';
  
  // Helper function to check if user is in assignee list (handles multiple assignees)
  const isUserAssigned = (assigneeString: string | null | undefined, username: string): boolean => {
    if (!assigneeString || !username) return false;
    // Split by comma and check if username exists in any of the assignees
    const assignees = assigneeString.split(',').map(a => a.trim().toLowerCase());
    return assignees.some(a => a === username.toLowerCase());
  };
  
  // Helper function to check if date is within calendar filter range
  const isWithinCalendarFilter = (dueDate: string | null | undefined): boolean => {
    if (calendarFilter === 'all') return true;
    if (!dueDate) return false;
    
    try {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      
      if (calendarFilter === 'week') {
        // Show items due within next 7 days (including today)
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return due >= today && due <= weekFromNow;
      }
      
      if (calendarFilter === 'month') {
        // Show items due within next 30 days (including today)
        const monthFromNow = new Date(today);
        monthFromNow.setDate(monthFromNow.getDate() + 30);
        return due >= today && due <= monthFromNow;
      }
      
      return true;
    } catch (error) {
      console.error('Error parsing date:', dueDate, error);
      return false;
    }
  };
  
  // First, filter projects
  const filteredProjects = projects.filter((project: any) => {
    // My Work filter: only show projects where user is owner OR in assignees list
    if (myWorkFilter) {
      const isOwner = project.owner?.toLowerCase() === currentUser.toLowerCase();
      const isAssignee = isUserAssigned(project.assignees, currentUser);
      if (!isOwner && !isAssignee) return false;
    }
    
    // Calendar filter: filter by due_date
    if (!isWithinCalendarFilter(project.due_date)) return false;
    
    // Type filter: if "task" selected, hide all projects
    if (filter === 'task') return false;
    
    // Category selection
    if (selectedCategory && project.category !== selectedCategory) return false;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.project_name?.toLowerCase().includes(query) ||
        project.project_id?.toLowerCase().includes(query) ||
        project.category?.toLowerCase().includes(query) ||
        project.owner?.toLowerCase().includes(query) ||
        project.status?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Get project IDs from filtered projects (for task filtering)
  const filteredProjectIds = new Set(filteredProjects.map((p: any) => p.project_id));

  // Filter tasks - if searching for project, show tasks belonging to that project
  const filteredTasks = tasks.filter((task: any) => {
    // My Work filter: check both 'assignee' and 'assignees' fields (handles both singular and plural)
    if (myWorkFilter) {
      const assigneeField = task.assignee || task.assignees;
      if (!isUserAssigned(assigneeField, currentUser)) return false;
    }
    
    // Calendar filter: filter by due_date
    if (!isWithinCalendarFilter(task.due_date)) return false;
    
    // Type filter: if "project" selected, hide all tasks
    if (filter === 'project') return false;
    
    // Status/Priority selections
    if (selectedStatus && task.status !== selectedStatus) return false;
    if (selectedPriority && task.priority !== selectedPriority) return false;
    
    // Search query - POWERFUL: if searching project, show its tasks
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Direct task match
      const taskMatch = (
        task.task_name?.toLowerCase().includes(query) ||
        task.task_id?.toLowerCase().includes(query) ||
        task.status?.toLowerCase().includes(query) ||
        task.priority?.toLowerCase().includes(query) ||
        task.assignee?.toLowerCase().includes(query) ||
        task.assignees?.toLowerCase().includes(query)
      );
      
      // Project match - show tasks belonging to matched projects
      const projectMatch = task.project_id && filteredProjectIds.has(task.project_id);
      
      return taskMatch || projectMatch;
    }
    
    return true;
  });

  // ═══════════════════════════════════════════════════════════
  // RECALCULATE STATS based on filtered data
  // ═══════════════════════════════════════════════════════════
  const filteredStats = {
    totalProjects: filteredProjects.length,
    activeProjects: filteredProjects.filter((p: any) => p.status === 'Active').length,
    totalTasks: filteredTasks.length,
    activeTasks: filteredTasks.filter((t: any) => t.status !== 'Done' && t.status !== 'Closed').length,
    doneTasks: filteredTasks.filter((t: any) => t.status === 'Done').length,
    dueToday: filteredTasks.filter((t: any) => {
      if (!t.due_date) return false;
      const today = new Date().toDateString();
      return new Date(t.due_date).toDateString() === today;
    }).length,
    dueThisWeek: filteredTasks.filter((t: any) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= today && dueDate <= weekFromNow;
    }).length,
    urgent: filteredTasks.filter((t: any) => t.priority === 'Urgent').length,
    overdue: filteredTasks.filter((t: any) => {
      if (!t.due_date || t.status === 'Done') return false;
      return new Date(t.due_date) < new Date();
    }).length,
    avgProgress: filteredProjects.length > 0 
      ? Math.round(filteredProjects.reduce((sum: number, p: any) => sum + Number(p.progress || 0), 0) / filteredProjects.length)
      : 0
  };

  // ═══════════════════════════════════════════════════════════
  // RECALCULATE CHART DATA based on filtered data
  // ═══════════════════════════════════════════════════════════
  const filteredByStatus: Record<string, number> = {};
  filteredTasks.forEach((t: any) => {
    const status = t.status || 'Unknown';
    filteredByStatus[status] = (filteredByStatus[status] || 0) + 1;
  });

  const filteredByPriority: Record<string, number> = {};
  filteredTasks.forEach((t: any) => {
    const priority = t.priority || 'Normal';
    filteredByPriority[priority] = (filteredByPriority[priority] || 0) + 1;
  });

  const filteredByCategory: Record<string, number> = {};
  filteredProjects.forEach((p: any) => {
    const category = p.category || 'Uncategorized';
    filteredByCategory[category] = (filteredByCategory[category] || 0) + 1;
  });

  // Completion rate based on filtered data
  const completionRate = pct(filteredStats.doneTasks, filteredStats.totalTasks);

  // Get greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night'; // 22:00 - 04:59
  };

  // Additional stats for better UI coverage
  const projectCategories = Array.from(new Set(filteredProjects.map((p: any) => p.category))).length;
  const completedProjects = filteredProjects.filter((p: any) => p.status === 'Completed').length;
  const onHoldProjects = filteredProjects.filter((p: any) => p.status === 'On Hold').length;
  const totalProjectTasks = filteredProjects.reduce((sum: number, p: any) => sum + Number(p.task_count || 0), 0);
  
  const inProgressTasks = filteredTasks.filter((t: any) => t.status === 'In Progress').length;
  const backlogTasks = filteredTasks.filter((t: any) => t.status === 'Backlog').length;
  const thisWeekTasks = filteredTasks.filter((t: any) => t.status === 'Minggu Ini').length;

  // Stat cards config - using FILTERED stats and respecting filter type
  const allStatCards = [
    // ALL & PROJECT cards
    {
      label: 'Total Projects', value: filteredStats.totalProjects,
      sub: `${filteredStats.activeProjects} active`, icon: Briefcase,
      tone: 'default', action: () => router.push('/projects'),
      type: 'project' as const
    },
    {
      label: 'Avg Progress', value: `${filteredStats.avgProgress}%`,
      sub: 'across all projects', icon: Gauge,
      tone: 'success', action: null,
      type: 'project' as const
    },
    {
      label: 'Categories', value: projectCategories,
      sub: 'project types', icon: TrendingUp,
      tone: 'default', action: null,
      type: 'project' as const
    },
    {
      label: 'Completed', value: completedProjects,
      sub: 'finished projects', icon: CheckCircle2,
      tone: 'success', action: null,
      type: 'project' as const
    },
    {
      label: 'On Hold', value: onHoldProjects,
      sub: 'paused projects', icon: AlertTriangle,
      tone: onHoldProjects > 0 ? 'warning' : 'default', action: null,
      type: 'project' as const
    },
    {
      label: 'Total Tasks', value: totalProjectTasks,
      sub: 'across projects', icon: ListTodo,
      tone: 'default', action: () => router.push('/tasks'),
      type: 'project' as const
    },
    {
      label: 'Project Owners', value: Array.from(new Set(filteredProjects.map((p: any) => p.owner).filter(Boolean))).length,
      sub: 'team members', icon: User,
      tone: 'default', action: null,
      type: 'project' as const
    },
    
    // ALL & TASK cards
    {
      label: 'Active Tasks', value: filteredStats.activeTasks,
      sub: `${filteredStats.totalTasks} total`, icon: ListTodo,
      tone: 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'In Progress', value: inProgressTasks,
      sub: 'currently working', icon: Zap,
      tone: 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'This Week', value: thisWeekTasks,
      sub: 'scheduled tasks', icon: CalendarClock,
      tone: 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'Backlog', value: backlogTasks,
      sub: 'pending tasks', icon: Clock3,
      tone: 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'Due Today', value: filteredStats.dueToday,
      sub: `${filteredStats.dueThisWeek} this week`, icon: CalendarClock,
      tone: filteredStats.dueToday > 0 ? 'warning' : 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'Urgent', value: filteredStats.urgent,
      sub: 'need attention', icon: Flame,
      tone: filteredStats.urgent > 0 ? 'danger' : 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'Overdue', value: filteredStats.overdue,
      sub: 'past due date', icon: AlertTriangle,
      tone: filteredStats.overdue > 0 ? 'danger' : 'default', action: () => router.push('/tasks'),
      type: 'task' as const
    },
    {
      label: 'Done Tasks', value: filteredStats.doneTasks,
      sub: `${completionRate}% completion`, icon: CheckCircle2,
      tone: 'success', action: null,
      type: 'task' as const
    },
  ];

  // Filter stat cards based on active filter
  const statCards = allStatCards.filter(card => {
    if (filter === 'all') {
      // For "all", show a balanced mix of both types (first 7 cards)
      return allStatCards.indexOf(card) < 7;
    }
    return card.type === filter;
  });

  // Chart options - No legend, thicker border
  const doughnutOpts = {
    responsive: true, 
    maintainAspectRatio: false, 
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}` } }
    }
  };

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} tasks` } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11, family: 'DM Sans' } } },
      y: { grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { stepSize: 1, font: { size: 11, family: 'DM Sans' } } }
    }
  };

  const categoryBarOpts = {
    indexAxis: 'y' as const,
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} projects` } } 
    },
    scales: {
      x: { 
        grid: { color: 'rgba(226,232,240,0.5)' }, 
        ticks: { stepSize: 1, font: { size: 11, family: 'DM Sans' } } 
      },
      y: { 
        grid: { display: false }, 
        ticks: { font: { size: 11, family: 'DM Sans' } } 
      }
    }
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11, family: 'DM Sans' } } },
      y: { grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { font: { size: 11, family: 'DM Sans' } } }
    }
  };

  const mkDoughnut = (obj: Record<string, any>, colorMap?: Record<string, string>, fallbackColors?: string[]) => {
    const keys = Object.keys(obj);
    const colors = colorMap ? keys.map((k, i) => colorMap[k] || (fallbackColors || [])[i] || '#94a3b8') : (fallbackColors || []);
    return { labels: keys, datasets: [{ data: Object.values(obj), backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] };
  };

  // Use FILTERED data for charts
  const statusData   = mkDoughnut(filteredByStatus, STATUS_COLOR);
  const priorityData = mkDoughnut(filteredByPriority, PRIORITY_COLOR);
  const categoryData = mkDoughnut(filteredByCategory, undefined, ['#7c3aed','#6366f1','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899']);

  // Category bar chart data - horizontal bars (FILTERED)
  const categoryBarData = {
    labels: Object.keys(filteredByCategory),
    datasets: [{
      data: Object.values(filteredByCategory).map(v => Number(v)),
      backgroundColor: Object.keys(filteredByCategory).map((_, idx) => {
        const colors = ['#7c3aed','#6366f1','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899'];
        return colors[idx % colors.length];
      }),
      borderRadius: 4,
      barThickness: 16
    }]
  };

  // Bar chart: tasks by project (FILTERED)
  const topProjects = [...filteredProjects].sort((a, b) => Number(b.task_count || 0) - Number(a.task_count || 0)).slice(0, 6);
  const barData = {
    labels: topProjects.map((p: any) => p.project_id),
    datasets: [{
      data: topProjects.map((p: any) => Number(p.task_count || 0)),
      backgroundColor: 'rgba(124,58,237,0.75)',
      borderRadius: 6,
      hoverBackgroundColor: '#7c3aed'
    }]
  };

  // Line chart: weekly trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const wpMap: Record<string, { created: number; done: number }> = {};
  (weeklyProgress as any[]).forEach(r => { wpMap[r.day?.split('T')[0] || ''] = { created: Number(r.created), done: Number(r.done) }; });
  const lineData = {
    labels: last7.map(d => format(new Date(d), 'dd MMM')),
    datasets: [
      {
        label: 'Created',
        data: last7.map(d => wpMap[d]?.created || 0),
        borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)',
        tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#7c3aed'
      },
      {
        label: 'Done',
        data: last7.map(d => wpMap[d]?.done || 0),
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
        tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#10b981'
      }
    ]
  };

  const sortedProjects = [...filteredProjects].sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0)).slice(0, 5);

  // Recent tasks (last 5 updated) - filtered
  const recentTasks = [...filteredTasks].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  return (
    <div 
      className={styles.layout}
      style={{
        padding: '14px',
        paddingBottom: '100px',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* ── Welcome bar with integrated search & filter ── */}
      <div className={styles.welcomeBar}>
        <div>
          <h1 className={styles.welcomeTitle}>
            Good {getGreeting()}, {user?.full_name || user?.username || 'there'} 👋
          </h1>
          <p className={styles.welcomeSub}>
            {filteredStats.dueToday > 0
              ? `You have ${filteredStats.dueToday} task${filteredStats.dueToday > 1 ? 's' : ''} due today and ${filteredStats.activeTasks} active tasks.`
              : `${filteredStats.activeTasks} active tasks across ${filteredStats.activeProjects} projects.`}
          </p>
        </div>

        {/* Search & Filter in the middle */}
        <div className={styles.welcomeCenter}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search tasks, projects, or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className={styles.filterButtons}>
            {(['all', 'project', 'task'] as const).map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'project' ? 'Projects' : 'Tasks'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.welcomeActions}>
          <button 
            className={`${styles.quickBtn} ${myWorkFilter ? styles.quickBtnActive : ''}`}
            onClick={() => setMyWorkFilter(!myWorkFilter)}
          >
            <User size={14} /> My Work
          </button>
          <div className={styles.calendarFilterGroup}>
            {(['all', 'week', 'month'] as const).map(cf => (
              <button
                key={cf}
                className={`${styles.calendarFilterBtn} ${calendarFilter === cf ? styles.calendarFilterBtnActive : ''}`}
                onClick={() => setCalendarFilter(cf)}
                title={cf === 'all' ? 'All dates' : cf === 'week' ? 'Next 7 days' : 'Next 30 days'}
              >
                {cf === 'all' ? 'All' : cf === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <button className={styles.quickBtn} onClick={() => router.push('/calendar')}>
            <CalendarClock size={14} /> Calendar
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <section className={styles.statsGrid}>
        {statCards.map(card => {
          const Icon = card.icon;
          const toneClass = card.tone === 'default' ? '' : styles[`tone${card.tone[0].toUpperCase()}${card.tone.slice(1)}`];
          return (
            <article
              key={card.label}
              className={`${styles.statCard} ${toneClass} ${card.action ? styles.statCardClickable : ''}`}
              onClick={card.action || undefined}
            >
              <div className={styles.statTop}>
                <span>{card.label}</span>
                <div className={styles.statIcon}><Icon size={16} /></div>
              </div>
              <strong>{card.value}</strong>
              <p>{card.sub}</p>
            </article>
          );
        })}
      </section>

      {/* ── New user welcome ── */}
      {filteredStats.totalProjects === 0 && filteredStats.totalTasks === 0 && (
        <section className={styles.welcomeNew}>
          <div className={styles.welcomeNewIcon}>
            <Sparkles size={28} />
          </div>
          <h2>Welcome to inyourtask!</h2>
          <p>Get started by creating your first project or task. You can also invite teammates to collaborate.</p>
          <div className={styles.welcomeNewActions}>
            <button className={styles.welcomeNewBtn} onClick={() => { const event = new Event('open-new-project', { bubbles: true }); document.dispatchEvent(event); }}>
              <Briefcase size={16} /> Create Project
            </button>
            <button className={styles.welcomeNewBtn} onClick={() => { const event = new Event('open-new-task', { bubbles: true }); document.dispatchEvent(event); }}>
              <ListTodo size={16} /> Create Task
            </button>
            <button className={styles.welcomeNewBtnSecondary} onClick={() => router.push('/chat')}>
              <MessageCircle size={16} /> Open Chat
            </button>
          </div>
        </section>
      )}

      {/* ── Main grid ── */}
      <div className={styles.mainGrid}>
        {/* Left column */}
        <div className={styles.leftCol}>
          {/* Charts row - Conditional based on filter */}
          <div className={styles.chartsRow}>
            {/* Task Status - Only show if NOT "project" filter */}
            {filter !== 'project' && (
              <article className={styles.panel}>
                <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>Task Status</h2>
                    <p>Distribution by workflow stage</p>
                  </div>
                  {Object.keys(filteredByStatus).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                      {Object.entries(filteredByStatus).slice(0, 1).map(([status]) => {
                        const color = STATUS_COLOR[status] || '#94a3b8';
                        return (
                          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                            <span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {Object.keys(filteredByStatus).length > 0 ? (
                  <div style={{ height: 200, padding: '4px 12px' }}>
                    <Doughnut data={statusData} options={doughnutOpts} />
                  </div>
                ) : (
                  <div className={styles.emptyState}>No tasks yet</div>
                )}
              </article>
            )}

            {/* Priority Focus - Only show if NOT "project" filter */}
            {filter !== 'project' && (
              <article className={styles.panel}>
                <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>Priority Focus</h2>
                    <p>Urgency breakdown</p>
                  </div>
                  {Object.keys(filteredByPriority).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                      {Object.entries(filteredByPriority).slice(0, 1).map(([priority]) => {
                        const color = PRIORITY_COLOR[priority] || '#94a3b8';
                        return (
                          <div key={priority} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                            <span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{priority}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {Object.keys(filteredByPriority).length > 0 ? (
                  <div style={{ height: 200, padding: '4px 12px' }}>
                    <Doughnut data={priorityData} options={doughnutOpts} />
                  </div>
                ) : (
                  <div className={styles.emptyState}>No tasks yet</div>
                )}
              </article>
            )}

            {/* Category Mix - Only show if NOT "task" filter */}
            {filter !== 'task' && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>Category Mix</h2>
                  <p>Project categories distribution</p>
                </div>
                {Object.keys(filteredByCategory).length > 0 ? (
                  <div style={{ height: 200, padding: '4px 12px' }}>
                    <Bar data={categoryBarData} options={categoryBarOpts} />
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div style={{ fontSize:'0.8rem', color:'var(--tx4)', marginBottom:8 }}>No projects yet</div>
                    <button className={styles.emptyStateBtn} onClick={() => { window.dispatchEvent(new Event('open-new-project')); }}>+ Create your first project</button>
                  </div>
                )}
              </article>
            )}

            {/* Project Status Distribution - Only show if filter is "project" */}
            {filter === 'project' && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>Project Status</h2>
                  <p>Distribution by status</p>
                </div>
                {(() => {
                  const projectByStatus: Record<string, number> = {};
                  filteredProjects.forEach((p: any) => {
                    const status = p.status || 'Unknown';
                    projectByStatus[status] = (projectByStatus[status] || 0) + 1;
                  });
                  const projectStatusColors: Record<string, string> = {
                    'Active': '#10b981',
                    'Planning': '#3b82f6',
                    'On Hold': '#f59e0b',
                    'Completed': '#7c3aed',
                    'Cancelled': '#ef4444'
                  };
                  const projectStatusData = mkDoughnut(projectByStatus, projectStatusColors);
                  return Object.keys(projectByStatus).length > 0 ? (
                    <div style={{ height: 200, padding: '4px 12px' }}>
                      <Doughnut data={projectStatusData} options={doughnutOpts} />
                    </div>
                  ) : (
                    <div className={styles.emptyState}>No projects yet</div>
                  );
                })()}
              </article>
            )}

            {/* Task Priority Distribution - Only show if filter is "task" */}
            {filter === 'task' && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>Priority Distribution</h2>
                  <p>Tasks by urgency level</p>
                </div>
                {Object.keys(filteredByPriority).length > 0 ? (
                  <div style={{ height: 200, padding: '4px 12px' }}>
                    <Bar data={{
                      labels: Object.keys(filteredByPriority),
                      datasets: [{
                        data: Object.values(filteredByPriority).map(v => Number(v)),
                        backgroundColor: Object.keys(filteredByPriority).map(p => PRIORITY_COLOR[p] || '#94a3b8'),
                        borderRadius: 6,
                        barThickness: 24
                      }]
                    }} options={barOpts} />
                  </div>
                ) : (
                  <div className={styles.emptyState}>No tasks yet</div>
                )}
              </article>
            )}
          </div>

          {/* Weekly trend - Only show if NOT "project" filter */}
          {filter !== 'project' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Weekly Activity</h2>
                <p>Tasks created vs completed — last 7 days</p>
                <div className={styles.legendRow}>
                  <span className={styles.legendDot} style={{ background: '#7c3aed' }} /> Created
                  <span className={styles.legendDot} style={{ background: '#10b981', marginLeft: 12 }} /> Done
                </div>
              </div>
              <div style={{ height: 130 }}>
                <Line data={lineData} options={lineOpts} />
              </div>
            </article>
          )}

          {/* Due Date Timeline - Only show if filter is "task" */}
          {filter === 'task' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Due Date Timeline</h2>
                <p>Tasks by due date status</p>
              </div>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const overdue = filteredTasks.filter((t: any) => {
                  if (!t.due_date || t.status === 'Done') return false;
                  return new Date(t.due_date) < today;
                }).length;
                
                const dueToday = filteredTasks.filter((t: any) => {
                  if (!t.due_date) return false;
                  return new Date(t.due_date).toDateString() === today.toDateString();
                }).length;
                
                const dueThisWeek = filteredTasks.filter((t: any) => {
                  if (!t.due_date) return false;
                  const dueDate = new Date(t.due_date);
                  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return dueDate > today && dueDate <= weekFromNow;
                }).length;
                
                const later = filteredTasks.filter((t: any) => {
                  if (!t.due_date) return false;
                  const dueDate = new Date(t.due_date);
                  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return dueDate > weekFromNow;
                }).length;
                
                const noDueDate = filteredTasks.filter((t: any) => !t.due_date).length;
                
                const timelineData = [
                  { label: 'Overdue', count: overdue, color: '#ef4444' },
                  { label: 'Due Today', count: dueToday, color: '#f59e0b' },
                  { label: 'This Week', count: dueThisWeek, color: '#3b82f6' },
                  { label: 'Later', count: later, color: '#10b981' },
                  { label: 'No Due Date', count: noDueDate, color: '#94a3b8' }
                ].filter(item => item.count > 0);
                
                const total = timelineData.reduce((sum, item) => sum + item.count, 0);
                
                return timelineData.length > 0 ? (
                  <div className={styles.categoryList}>
                    {timelineData.map(({ label, count, color }) => {
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={label} className={styles.categoryItem}>
                          <div className={styles.categoryLeft}>
                            <div className={styles.categoryDot} style={{ background: color }} />
                            <span className={styles.categoryName}>{label}</span>
                          </div>
                          <div className={styles.categoryRight}>
                            <div className={styles.categoryBar}>
                              <div className={styles.categoryBarFill} style={{ width: `${percentage}%`, background: color }} />
                            </div>
                            <span className={styles.categoryCount}>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No tasks with due dates</div>
                );
              })()}
            </article>
          )}

          {/* Tasks per project bar - Only show if NOT "task" filter */}
          {filter !== 'task' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Tasks per Project</h2>
                <p>Workload distribution across projects</p>
              </div>
              <div style={{ height: 130 }}>
                {topProjects.length > 0
                  ? <Bar data={barData} options={barOpts} />
                  : <div className={styles.emptyState}>No projects yet</div>}
              </div>
            </article>
          )}

          {/* Project Categories - Only show if filter is "project" */}
          {filter === 'project' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Project Categories</h2>
                <p>Distribution by category</p>
              </div>
              {Object.keys(filteredByCategory).length > 0 ? (
                <div className={styles.categoryList}>
                  {Object.entries(filteredByCategory)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .map(([category, count], idx) => {
                      const colors = ['#7c3aed','#6366f1','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899'];
                      const color = colors[idx % colors.length];
                      const total = Object.values(filteredByCategory).reduce((sum, val) => sum + Number(val), 0);
                      const percentage = Math.round((Number(count) / total) * 100);
                      return (
                        <div key={category} className={styles.categoryItem}>
                          <div className={styles.categoryLeft}>
                            <div className={styles.categoryDot} style={{ background: color }} />
                            <span className={styles.categoryName}>{category}</span>
                          </div>
                          <div className={styles.categoryRight}>
                            <div className={styles.categoryBar}>
                              <div className={styles.categoryBarFill} style={{ width: `${percentage}%`, background: color }} />
                            </div>
                            <span className={styles.categoryCount}>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className={styles.emptyState}>No categories yet</div>
              )}
            </article>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Task Progress (was "My Tasks") - Only show if NOT "project" filter */}
          {filter !== 'project' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2>Task Progress</h2>
                    <p>Top tasks by completion rate</p>
                  </div>
                  <button className={styles.viewAllBtn} onClick={() => router.push('/tasks')}>
                    View all <ArrowRight size={13} />
                  </button>
                </div>
              </div>
              {filteredTasks.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p>No tasks yet</p>
                </div>
              ) : (
                <div className={styles.taskList}>
                  {[...filteredTasks]
                    .sort((a: any, b: any) => {
                      const progressA = parseInt(String(a.progress || '0').replace('%', '')) || 0;
                      const progressB = parseInt(String(b.progress || '0').replace('%', '')) || 0;
                      return progressB - progressA;
                    })
                    .slice(0, 5)
                    .map((task: any) => {
                      const due = formatDue(task.due_date);
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';
                      const progress = parseInt(String(task.progress || '0').replace('%', '')) || 0;
                      return (
                        <div key={task.task_id} className={styles.taskItem}>
                          <div className={styles.taskLeft}>
                            <div className={styles.taskPriorityDot} style={{ background: PRIORITY_COLOR[task.priority] || '#94a3b8' }} />
                            <div className={styles.taskInfo}>
                              <div className={styles.taskName}>{task.task_name}</div>
                              <div className={styles.taskMeta}>
                                <span className={styles.taskProject}>{task.project_id}</span>
                                {due && <span className={`${styles.taskDue} ${isOverdue ? styles.taskDueOverdue : ''}`}>
                                  <Clock3 size={11} /> {due}
                                </span>}
                              </div>
                            </div>
                          </div>
                          <div className={styles.taskRight}>
                            <span className={styles.taskStatus} style={{ background: `${STATUS_COLOR[task.status] || '#94a3b8'}18`, color: STATUS_COLOR[task.status] || '#94a3b8' }}>
                              {task.status}
                            </span>
                            <div className={styles.taskProgress}>
                              <div className={styles.taskProgressBar}>
                                <div className={styles.taskProgressFill} style={{ width: `${progress}%` }} />
                              </div>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </article>
          )}

          {/* Project Progress - Only show if NOT "task" filter */}
          {filter !== 'task' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2>Project Progress</h2>
                    <p>Top projects by completion</p>
                  </div>
                  <button className={styles.viewAllBtn} onClick={() => router.push('/projects')}>
                    View all <ArrowRight size={13} />
                  </button>
                </div>
              </div>
              {sortedProjects.length === 0 ? (
                <div className={styles.emptyState}>No projects yet</div>
              ) : (
                <div className={styles.projectList}>
                  {sortedProjects.map((p: any) => {
                    const pctVal = Number(p.progress || 0);
                    return (
                      <div key={p.project_id} className={styles.projectCard}>
                        <div className={styles.projectHeader}>
                          <div>
                            <div className={styles.projectCode}>{p.project_id}</div>
                            <h3>{p.project_name}</h3>
                          </div>
                          <div className={styles.projectMetric}>{pctVal.toFixed(0)}%</div>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${pctVal}%` }} />
                        </div>
                        <div className={styles.projectMeta}>
                          <span>{p.category}</span>
                          <span><User size={10} /> {p.owner || 'No owner'}</span>
                          <span>{p.task_count || 0} tasks</span>
                          <span className={`${styles.projectStatus} ${p.status === 'Active' ? styles.statusActive : ''}`}>{p.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          )}

          {/* Recent Tasks - Only show if NOT "project" filter */}
          {filter !== 'project' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Recent Updates</h2>
                <p>Latest task activity</p>
              </div>
              <div className={styles.recentList}>
                {recentTasks.map((task: any) => (
                  <div key={task.task_id} className={styles.recentItem}>
                    <div className={styles.recentIcon} style={{ background: `${PRIORITY_COLOR[task.priority] || '#94a3b8'}18` }}>
                      <Zap size={13} style={{ color: PRIORITY_COLOR[task.priority] || '#94a3b8' }} />
                    </div>
                    <div className={styles.recentInfo}>
                      <div className={styles.recentName}>{task.task_name}</div>
                      <div className={styles.recentMeta}>{task.project_id} · {task.status}</div>
                    </div>
                    <div className={styles.recentTime}>
                      {format(new Date(task.updated_at), 'dd MMM')}
                    </div>
                  </div>
                ))}
                {recentTasks.length === 0 && <div className={styles.emptyState}>No recent activity</div>}
              </div>
            </article>
          )}

          {/* Task Status Breakdown - Only show if filter is "task" */}
          {filter === 'task' && (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Status Breakdown</h2>
                <p>Tasks by workflow stage</p>
              </div>
              {Object.keys(filteredByStatus).length > 0 ? (
                <div className={styles.categoryList}>
                  {Object.entries(filteredByStatus)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .map(([status, count]) => {
                      const color = STATUS_COLOR[status] || '#94a3b8';
                      const total = Object.values(filteredByStatus).reduce((sum, val) => sum + Number(val), 0);
                      const percentage = Math.round((Number(count) / total) * 100);
                      return (
                        <div key={status} className={styles.categoryItem}>
                          <div className={styles.categoryLeft}>
                            <div className={styles.categoryDot} style={{ background: color }} />
                            <span className={styles.categoryName}>{status}</span>
                          </div>
                          <div className={styles.categoryRight}>
                            <div className={styles.categoryBar}>
                              <div className={styles.categoryBarFill} style={{ width: `${percentage}%`, background: color }} />
                            </div>
                            <span className={styles.categoryCount}>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                  <div className={styles.emptyState}>
                    <div style={{ fontSize:'0.8rem', color:'var(--tx4)', marginBottom:8 }}>No tasks yet</div>
                    <button className={styles.emptyStateBtn} onClick={() => { window.dispatchEvent(new Event('open-new-task')); }}>+ Create your first task</button>
                  </div>
                )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
