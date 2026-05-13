'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import {
  Activity, Briefcase, CheckCircle2, Clock3, FileEdit,
  FolderOpen, ListTodo, Sparkles, UserRound, AlertTriangle,
  TrendingUp, Calendar, BarChart3, Search, X, Download, Filter, ChevronDown
} from 'lucide-react';
import AppShell from '@/components/Sidebar';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import { useApp } from '@/lib/AppContext';
import styles from './tracking.module.css';

const CHANGE_META: Record<string, { icon: any; label: string; color: string }> = {
  Name:         { icon: FileEdit,    label: 'Name Changed', color: '#3b82f6' },
  Status:       { icon: Activity,    label: 'Status Changed', color: '#8b5cf6' },
  Priority:     { icon: Sparkles,    label: 'Priority Changed', color: '#f59e0b' },
  Progress:     { icon: CheckCircle2,label: 'Progress Updated', color: '#10b981' },
  Assignee:     { icon: UserRound,   label: 'Assignee Changed', color: '#6366f1' },
  Assignees:    { icon: UserRound,   label: 'Assignees Changed', color: '#6366f1' },
  Category:     { icon: FolderOpen,  label: 'Category Changed', color: '#ec4899' },
  Owner:        { icon: UserRound,   label: 'Owner Changed', color: '#6366f1' },
  Project:      { icon: Briefcase,   label: 'Project Changed', color: '#8b5cf6' },
  'Due Date':   { icon: Clock3,      label: 'Due Date Changed', color: '#ef4444' },
  'Brief/Revisi':{ icon: FileEdit,   label: 'Brief/Revision', color: '#f59e0b' },
  Created:      { icon: Sparkles,    label: 'Created', color: '#10b981' },
  Deleted:      { icon: X,           label: 'Deleted', color: '#ef4444' }
};

function formatValue(value: any) {
  return String(value || '').trim() || '(empty)';
}

function getStatusDuration(logs: any[], itemId: string, status: string) {
  const itemLogs = logs.filter(l => l.item_id === itemId && l.change_type === 'Status');
  let duration = 0;
  let lastStatusChange = null;
  
  for (let i = itemLogs.length - 1; i >= 0; i--) {
    const log = itemLogs[i];
    if (log.to_value === status) {
      lastStatusChange = new Date(log.changed_at || log.timestamp);
    } else if (lastStatusChange && log.from_value === status) {
      const changeDate = new Date(log.changed_at || log.timestamp);
      duration += differenceInDays(changeDate, lastStatusChange);
      lastStatusChange = null;
    }
  }
  
  if (lastStatusChange) {
    duration += differenceInDays(new Date(), lastStatusChange);
  }
  
  return duration;
}

function analyzeItem(logs: any[], itemId: string, itemType: string) {
  const itemLogs = logs.filter(l => l.item_id === itemId && l.item_type === itemType);
  
  const revisionCount = itemLogs.filter(l => l.change_type === 'Brief/Revisi').length;
  const statusChanges = itemLogs.filter(l => l.change_type === 'Status').length;
  const priorityChanges = itemLogs.filter(l => l.change_type === 'Priority').length;
  const assigneeChanges = itemLogs.filter(l => l.change_type === 'Assignees' || l.change_type === 'Assignee').length;
  const dueDateChanges = itemLogs.filter(l => l.change_type === 'Due Date').length;
  
  const createdLog = itemLogs.find(l => l.change_type === 'Created');
  const createdDate = createdLog ? new Date(createdLog.changed_at || createdLog.timestamp) : null;
  const ageInDays = createdDate ? differenceInDays(new Date(), createdDate) : 0;
  
  const statusHistory = itemLogs
    .filter(l => l.change_type === 'Status')
    .map(l => ({
      status: l.to_value,
      date: new Date(l.changed_at || l.timestamp),
      from: l.from_value
    }));
  
  return {
    revisionCount,
    statusChanges,
    priorityChanges,
    assigneeChanges,
    dueDateChanges,
    ageInDays,
    statusHistory,
    totalChanges: itemLogs.length,
    lastUpdate: itemLogs.length > 0 ? new Date(itemLogs[0].changed_at || itemLogs[0].timestamp) : null
  };
}

export default function TrackingPage() {
  return <Suspense fallback={null}><TrackingContent /></Suspense>;
}

function TrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, data, authChecked, toast, handleLogout, showToast } = useApp();
  
  const [filter, setFilter] = useState<'all' | 'project' | 'task'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(searchParams.get('item'));
  const [viewMode, setViewMode] = useState<'timeline' | 'analytics'>('timeline');
  
  // New filter states
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);

  const nav = (tab: string) => router.push(tab === 'overview' ? '/' : `/${tab === 'ai' ? 'ai-assistant' : tab}`);

  const logs = useMemo(() => data?.logs || [], [data]);
  
  // Get unique change types for filter
  const changeTypes = useMemo(() => {
    const types = new Set<string>(logs.map((l: any) => l.change_type).filter(Boolean));
    return ['all', ...Array.from(types)] as string[];
  }, [logs]);
  
  const filteredLogs = useMemo(() => {
    let result = logs;
    
    // Filter by type
    if (filter !== 'all') {
      result = result.filter((l: any) => l.item_type?.toLowerCase() === filter);
    }
    
    // Filter by change type
    if (changeTypeFilter !== 'all') {
      result = result.filter((l: any) => l.change_type === changeTypeFilter);
    }
    
    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date = now;
      
      switch (dateRangeFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'custom':
          if (customStartDate) startDate = new Date(customStartDate);
          if (customEndDate) endDate = new Date(customEndDate);
          break;
      }
      
      if (startDate) {
        result = result.filter((l: any) => {
          const logDate = new Date(l.changed_at || l.timestamp);
          return logDate >= startDate! && logDate <= endDate;
        });
      }
    }
    
    // Filter by selected item
    if (selectedItem) {
      result = result.filter((l: any) => l.item_id === selectedItem);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((l: any) => 
        l.item_name?.toLowerCase().includes(query) ||
        l.item_id?.toLowerCase().includes(query) ||
        l.project_name?.toLowerCase().includes(query) ||
        l.change_type?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [filter, logs, selectedItem, searchQuery, changeTypeFilter, dateRangeFilter, customStartDate, customEndDate]);

  const stats = useMemo(() => ({
    total: logs.length,
    projects: logs.filter((l: any) => l.item_type === 'Project').length,
    tasks: logs.filter((l: any) => l.item_type === 'Task').length,
    contributors: new Set(logs.map((l: any) => l.changed_by)).size,
    revisions: logs.filter((l: any) => l.change_type === 'Brief/Revisi').length,
    today: logs.filter((l: any) => {
      const logDate = new Date(l.changed_at || l.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length
  }), [logs]);

  // Get unique items for analytics
  const uniqueItems = useMemo(() => {
    const items = new Map();
    logs.forEach((log: any) => {
      if (!items.has(log.item_id)) {
        items.set(log.item_id, {
          id: log.item_id,
          name: log.item_name,
          type: log.item_type,
          project: log.project_name
        });
      }
    });
    return Array.from(items.values());
  }, [logs]);

  // Analytics for selected item
  const itemAnalytics = useMemo(() => {
    if (!selectedItem) return null;
    const item = uniqueItems.find(i => i.id === selectedItem);
    if (!item) return null;
    return {
      ...item,
      ...analyzeItem(logs, selectedItem, item.type)
    };
  }, [selectedItem, logs, uniqueItems]);

  useEffect(() => {
    const itemParam = searchParams.get('item');
    if (itemParam) {
      setSelectedItem(itemParam);
      setViewMode('analytics');
    }
  }, [searchParams]);

  // Export to PDF function
  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Tracking Report - ${format(new Date(), 'dd MMM yyyy')}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1F2937; }
            h1 { color: #7c3aed; margin-bottom: 8px; }
            .subtitle { color: #6B7280; margin-bottom: 32px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px; }
            .stat-card strong { font-size: 24px; color: #111827; display: block; margin: 8px 0; }
            .stat-card span { color: #6B7280; font-size: 14px; }
            .log-item { padding: 16px; border-left: 3px solid #7c3aed; background: #F9FAFB; margin-bottom: 12px; border-radius: 4px; }
            .log-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .log-title { font-weight: 600; color: #111827; }
            .log-time { color: #9CA3AF; font-size: 12px; }
            .log-change { padding: 8px 12px; background: white; border-radius: 4px; margin-top: 8px; }
            .change-label { font-size: 12px; color: #7c3aed; font-weight: 600; margin-bottom: 4px; }
            .change-values { font-size: 14px; }
            .old-value { color: #EF4444; text-decoration: line-through; }
            .new-value { color: #10B981; font-weight: 600; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>📊 Tracking & Analytics Report</h1>
          <p class="subtitle">Generated on ${format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
          
          <div class="stats">
            <div class="stat-card">
              <span>Total Changes</span>
              <strong>${stats.total}</strong>
              <p>${stats.today} today</p>
            </div>
            <div class="stat-card">
              <span>Project Changes</span>
              <strong>${stats.projects}</strong>
            </div>
            <div class="stat-card">
              <span>Task Changes</span>
              <strong>${stats.tasks}</strong>
            </div>
            <div class="stat-card">
              <span>Revisions</span>
              <strong>${stats.revisions}</strong>
            </div>
          </div>
          
          <h2>Change History</h2>
          ${filteredLogs.map((log: any) => `
            <div class="log-item">
              <div class="log-header">
                <div class="log-title">${log.item_name} (${log.item_id})</div>
                <div class="log-time">${format(new Date(log.changed_at || log.timestamp), 'dd MMM yyyy, HH:mm')}</div>
              </div>
              <div class="log-change">
                <div class="change-label">${log.change_type}</div>
                <div class="change-values">
                  <span class="old-value">${formatValue(log.from_value)}</span>
                  →
                  <span class="new-value">${formatValue(log.to_value)}</span>
                </div>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #6B7280;">
                Changed by: ${log.changed_by || 'System'} | Version: ${log.from_version} → ${log.to_version}
              </div>
            </div>
          `).join('')}
          
          <div class="footer">
            <p>This report was generated automatically by Raymating Tracking System</p>
            <p>© ${new Date().getFullYear()} Raymating. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracking-report-${format(new Date(), 'yyyy-MM-dd')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast?.('Report exported! Open the HTML file and print to PDF', 'success');
    } catch (error) {
      showToast?.('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell 
        activeTab="tracking" 
        user={user} 
        onLogout={handleLogout}
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => router.push('/projects')}
      >
        <div className={styles.layout}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>
                {selectedItem ? (
                  <>
                    <button className={styles.backBtn} onClick={() => setSelectedItem(null)}>
                      ← Back
                    </button>
                    {itemAnalytics?.name || selectedItem}
                  </>
                ) : (
                  'Tracking & Analytics'
                )}
              </h1>
              <p className={styles.pageSubtitle}>
                {selectedItem 
                  ? 'Detailed history and analytics for this item'
                  : 'Monitor all project and task changes with detailed insights'
                }
              </p>
            </div>
            <div className={styles.headerActions}>
              {!selectedItem && (
                <>
                  <div className={styles.searchBox}>
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or change type..."
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
                  
                  {/* Advanced Filters */}
                  <div className={styles.filterDropdownContainer}>
                    <button 
                      className={styles.filterDropdownBtn}
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    >
                      <Filter size={14} /> Filters <ChevronDown size={14} />
                    </button>
                    {showFilterDropdown && (
                      <div className={styles.filterDropdown}>
                        <div className={styles.filterSection}>
                          <label>Change Type</label>
                          <select 
                            value={changeTypeFilter} 
                            onChange={(e) => setChangeTypeFilter(e.target.value)}
                            className={styles.filterSelect}
                          >
                            {changeTypes.map(type => (
                              <option key={type} value={type}>
                                {type === 'all' ? 'All Types' : type}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className={styles.filterSection}>
                          <label>Date Range</label>
                          <select 
                            value={dateRangeFilter} 
                            onChange={(e) => setDateRangeFilter(e.target.value as any)}
                            className={styles.filterSelect}
                          >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>
                        
                        {dateRangeFilter === 'custom' && (
                          <div className={styles.filterSection}>
                            <label>Custom Date Range</label>
                            <div className={styles.dateInputs}>
                              <input 
                                type="date" 
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className={styles.dateInput}
                                placeholder="Start date"
                              />
                              <span>to</span>
                              <input 
                                type="date" 
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className={styles.dateInput}
                                placeholder="End date"
                              />
                            </div>
                          </div>
                        )}
                        
                        <button 
                          className={styles.clearFiltersBtn}
                          onClick={() => {
                            setChangeTypeFilter('all');
                            setDateRangeFilter('all');
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }}
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Export Button */}
                  <button 
                    className={styles.exportBtn}
                    onClick={exportToPDF}
                    disabled={exporting}
                  >
                    <Download size={14} />
                    {exporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                  
                  <div className={styles.filterButtons}>
                    {(['all', 'project', 'task'] as const).map(f => (
                      <button key={f} type="button"
                        className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                        onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : f === 'project' ? 'Projects' : 'Tasks'}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {selectedItem && (
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewBtn} ${viewMode === 'timeline' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('timeline')}
                  >
                    <Activity size={14} /> Timeline
                  </button>
                  <button
                    className={`${styles.viewBtn} ${viewMode === 'analytics' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('analytics')}
                  >
                    <BarChart3 size={14} /> Analytics
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          {!selectedItem && (
            <section className={styles.statsGrid}>
              <article className={styles.statCard}>
                <div className={styles.statIcon} style={{background: '#ede9fe'}}>
                  <Activity size={20} style={{color: '#7c3aed'}} />
                </div>
                <div className={styles.statContent}>
                  <span>Total Changes</span>
                  <strong>{stats.total}</strong>
                  <p>{stats.today} today</p>
                </div>
              </article>
              <article className={styles.statCard}>
                <div className={styles.statIcon} style={{background: '#dbeafe'}}>
                  <Briefcase size={20} style={{color: '#3b82f6'}} />
                </div>
                <div className={styles.statContent}>
                  <span>Project Changes</span>
                  <strong>{stats.projects}</strong>
                  <p>Across all projects</p>
                </div>
              </article>
              <article className={styles.statCard}>
                <div className={styles.statIcon} style={{background: '#dcfce7'}}>
                  <ListTodo size={20} style={{color: '#10b981'}} />
                </div>
                <div className={styles.statContent}>
                  <span>Task Changes</span>
                  <strong>{stats.tasks}</strong>
                  <p>Task updates</p>
                </div>
              </article>
              <article className={styles.statCard}>
                <div className={styles.statIcon} style={{background: '#fef3c7'}}>
                  <FileEdit size={20} style={{color: '#f59e0b'}} />
                </div>
                <div className={styles.statContent}>
                  <span>Revisions</span>
                  <strong>{stats.revisions}</strong>
                  <p>Brief/content changes</p>
                </div>
              </article>
            </section>
          )}

          {/* Item Analytics View */}
          {selectedItem && viewMode === 'analytics' && itemAnalytics && (
            <section className={styles.analyticsSection}>
              <div className={styles.analyticsGrid}>
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsHeader}>
                    <h3>Overview</h3>
                    <span className={`${styles.itemTypeBadge} ${itemAnalytics.type === 'Project' ? styles.badgeProject : styles.badgeTask}`}>
                      {itemAnalytics.type === 'Project' ? <Briefcase size={12} /> : <ListTodo size={12} />}
                      {itemAnalytics.type}
                    </span>
                  </div>
                  <div className={styles.analyticsStats}>
                    <div className={styles.analyticsStat}>
                      <Clock3 size={16} />
                      <div>
                        <strong>{itemAnalytics.ageInDays}</strong>
                        <span>Days Old</span>
                      </div>
                    </div>
                    <div className={styles.analyticsStat}>
                      <Activity size={16} />
                      <div>
                        <strong>{itemAnalytics.totalChanges}</strong>
                        <span>Total Changes</span>
                      </div>
                    </div>
                    <div className={styles.analyticsStat}>
                      <FileEdit size={16} />
                      <div>
                        <strong>{itemAnalytics.revisionCount}</strong>
                        <span>Revisions</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsHeader}>
                    <h3>Change Breakdown</h3>
                    <AlertTriangle size={16} style={{color: itemAnalytics.revisionCount > 3 ? '#ef4444' : '#10b981'}} />
                  </div>
                  <div className={styles.changeBreakdown}>
                    <div className={styles.breakdownItem}>
                      <span>Status Changes</span>
                      <strong>{itemAnalytics.statusChanges}</strong>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span>Priority Changes</span>
                      <strong>{itemAnalytics.priorityChanges}</strong>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span>Assignee Changes</span>
                      <strong>{itemAnalytics.assigneeChanges}</strong>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span>Due Date Changes</span>
                      <strong>{itemAnalytics.dueDateChanges}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsHeader}>
                    <h3>Status History</h3>
                    <TrendingUp size={16} />
                  </div>
                  <div className={styles.statusHistory}>
                    {itemAnalytics.statusHistory.length > 0 ? (
                      itemAnalytics.statusHistory.map((sh: any, idx: number) => (
                        <div key={idx} className={styles.statusHistoryItem}>
                          <div className={styles.statusDot}></div>
                          <div className={styles.statusInfo}>
                            <strong>{sh.status}</strong>
                            <span>{format(sh.date, 'dd MMM yyyy, HH:mm')}</span>
                            {sh.from && <small>from {sh.from}</small>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyText}>No status changes yet</p>
                    )}
                  </div>
                </div>

                {itemAnalytics.revisionCount > 0 && (
                  <div className={styles.analyticsCard}>
                    <div className={styles.analyticsHeader}>
                      <h3>Revision Analysis</h3>
                      <AlertTriangle size={16} style={{color: '#f59e0b'}} />
                    </div>
                    <div className={styles.revisionAnalysis}>
                      <p className={styles.revisionText}>
                        This {itemAnalytics.type.toLowerCase()} has undergone <strong>{itemAnalytics.revisionCount} revision{itemAnalytics.revisionCount > 1 ? 's' : ''}</strong>.
                        {itemAnalytics.revisionCount > 3 && (
                          <span className={styles.warningText}>
                            ⚠️ High revision count may indicate scope changes or unclear requirements.
                          </span>
                        )}
                      </p>
                      {itemAnalytics.dueDateChanges > 0 && (
                        <p className={styles.revisionText}>
                          Due date has been changed <strong>{itemAnalytics.dueDateChanges} time{itemAnalytics.dueDateChanges > 1 ? 's' : ''}</strong>, 
                          which may indicate delays or reprioritization.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Timeline View */}
          {(!selectedItem || viewMode === 'timeline') && (
            <section className={styles.timeline}>
              {filteredLogs.length === 0 ? (
                <div className={styles.emptyState}>
                  <Activity size={32} />
                  <h3>No changes found</h3>
                  <p>
                    {searchQuery 
                      ? 'Try adjusting your search query'
                      : selectedItem
                        ? 'No history available for this item'
                        : 'Changes will appear automatically when tasks or projects are updated'
                    }
                  </p>
                  {(searchQuery || selectedItem) && (
                    <button 
                      className={styles.clearFiltersBtn}
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedItem(null);
                        setFilter('all');
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log: any, index: number) => {
                  const meta = CHANGE_META[log.change_type] || { icon: Activity, label: log.change_type || 'Change', color: '#64748b' };
                  const Icon = meta.icon;
                  const isRevision = log.change_type === 'Brief/Revisi';
                  const isDueDateChange = log.change_type === 'Due Date';
                  const isStatusChange = log.change_type === 'Status';
                  
                  return (
                    <article key={log.id || index} className={styles.timelineItem}>
                      <div className={styles.timelineRail}>
                        <div 
                          className={styles.timelineIcon} 
                          style={{background: meta.color + '20', color: meta.color}}
                        >
                          <Icon size={14} />
                        </div>
                      </div>
                      <div className={styles.timelineCard}>
                        <div className={styles.timelineHeader}>
                          <div className={styles.headerLeft}>
                            <button
                              className={`${styles.itemType} ${log.item_type === 'Project' ? styles.itemTypeProject : styles.itemTypeTask}`}
                              onClick={() => {
                                setSelectedItem(log.item_id);
                                setViewMode('analytics');
                              }}
                              title="View analytics"
                            >
                              {log.item_type === 'Project' ? <Briefcase size={11} /> : <ListTodo size={11} />}
                              {log.item_type}
                            </button>
                            <span className={styles.itemCode}>{log.item_id}</span>
                            <h3>{log.item_name}</h3>
                            {isRevision && <span className={styles.revisionBadge}>📝 Revision</span>}
                            {isDueDateChange && <span className={styles.delayBadge}>⏰ Schedule Change</span>}
                          </div>
                          <time className={styles.timestamp}>
                            {format(new Date(log.changed_at || log.timestamp), 'dd MMM yyyy, HH:mm')}
                          </time>
                        </div>
                        <div className={styles.changeBlock}>
                          <div className={styles.changeLabel}>
                            <Icon size={12} />
                            {meta.label}
                          </div>
                          <div className={styles.changeValues}>
                            <span className={styles.oldValue}>{formatValue(log.from_value)}</span>
                            <span className={styles.arrow}>→</span>
                            <span className={styles.newValue}>{formatValue(log.to_value)}</span>
                          </div>
                          {isRevision && log.to_value && (
                            <div className={styles.revisionNote}>
                              <FileEdit size={12} />
                              <span>{log.to_value}</span>
                            </div>
                          )}
                          {isStatusChange && (
                            <div className={styles.statusNote}>
                              {log.to_value === 'On Hold' && (
                                <span className={styles.warningNote}>⚠️ Work paused - may cause delays</span>
                              )}
                              {log.to_value === 'Backlog' && log.from_value !== '' && (
                                <span className={styles.warningNote}>⚠️ Moved back to backlog - reprioritization</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={styles.timelineFooter}>
                          <span className={styles.versionBadge}>v{log.from_version} → v{log.to_version}</span>
                          <span className={styles.authorBadge}>
                            <UserRound size={10} />
                            {log.changed_by || 'System'}
                          </span>
                          {log.project_name && log.item_type === 'Task' && (
                            <span className={styles.projectBadge}>
                              <Briefcase size={10} />
                              {log.project_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}
        </div>
      </AppShell>
      <MobileHeader 
        title="Tracking" 
        user={user} 
        onLogout={handleLogout} 
      />
      <BottomNav activeTab="tracking" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
