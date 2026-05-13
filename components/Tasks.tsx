'use client';

import { useState } from 'react';
import { CalendarDays, FileText, Link2, NotebookText, Users } from 'lucide-react';
import { format } from 'date-fns';
import styles from './DataTable.module.css';

interface TasksProps {
  tasks: any[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  currentUser?: string;
  /** Controlled filter from parent (mobile header) */
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
}

function splitCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesUser(value: string | null | undefined, currentUser?: string) {
  if (!value || !currentUser) return false;
  return splitCsv(value).some((item) => item.toLowerCase() === currentUser.toLowerCase());
}

function formatDueDate(value?: string | null) {
  return value ? format(new Date(value), 'dd MMM yyyy') : 'No due date';
}

function preview(value?: string | null, max = 88) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function priorityClass(priority: string, classes: Record<string, string>) {
  switch (priority) {
    case 'Urgent':
      return classes.badgeUrgent;
    case 'High':
      return classes.badgeHigh;
    case 'Low':
      return classes.badgeLow;
    case 'Recurring':
      return classes.badgeRecurring;
    default:
      return classes.badgeNormal;
  }
}

export default function Tasks({ tasks, onEdit, onDelete, currentUser, activeFilter, onFilterChange }: TasksProps) {
  const assigneeFilter = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'My Tasks' },
  ] as const;

  const [internalFilter, setInternalFilter] = useState<(typeof assigneeFilter)[number]['id']>('all');
  const activeFilterId = (activeFilter as (typeof assigneeFilter)[number]['id']) ?? internalFilter;
  const setActiveFilter = (v: (typeof assigneeFilter)[number]['id']) => { setInternalFilter(v); onFilterChange?.(v); };

  // Show loading state if tasks is undefined or null
  if (!tasks) {
    return (
      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.titleGroup}>
            <h2>All Tasks</h2>
            <p>Kelola task, progress, brief, dan deadline tanpa kehilangan detail penting.</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              border: '3px solid rgba(124, 58, 237, 0.2)', 
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p>Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeFilterId === 'mine') return includesUser(task.assignees, currentUser);
    return true;
  });

  const emptyMessage =
    activeFilterId === 'mine'
      ? 'Belum ada task yang ditugaskan ke kamu.'
      : 'Belum ada task.';

  return (
    <div className={styles.card}>
      <div className={styles.filterBar}>
        <div className={styles.titleGroup}>
          <h2>All Tasks</h2>
          <p>Kelola task, progress, brief, dan deadline tanpa kehilangan detail penting.</p>
        </div>
        <div className={styles.filterButtons}>
          {assigneeFilter.map((filter) => (
            <button
              key={filter.id}
              className={`${styles.btn} ${styles.btnSm} ${activeFilterId === filter.id ? styles.btnPrimary : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>{emptyMessage}</div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignees</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Progress</th>
                    <th>Due</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const assignees = splitCsv(task.assignees);
                    const progressValue = Number(String(task.progress || '0').replace('%', '')) || 0;

                    return (
                      <tr key={task.task_id}>
                        <td><span className={styles.code}>{task.task_id}</span></td>
                        <td className={styles.primaryCell}>
                          <div className={styles.primaryTitle}>{task.task_name}</div>
                          <div className={styles.previewText}>
                            {preview(task.brief || task.notes || 'Belum ada brief atau notes.')}
                          </div>
                          {task.url ? (
                            <div className={styles.inlineMeta}>
                              <Link2 size={14} />
                              {task.url.split('\n').filter(Boolean).length} link
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className={styles.stackCompact}>
                            <strong>{task.project_id}</strong>
                            <span className={styles.muted}>{formatDueDate(task.due_date)}</span>
                          </div>
                        </td>
                        <td>
                          {assignees.length > 0 ? (
                            <div className={styles.assigneeList}>
                              {assignees.map((assignee) => (
                                <span key={assignee} className={styles.assigneeChip}>{assignee}</span>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.muted}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${task.status === 'Done' ? styles.badgeDone : styles.badgeActive}`}>
                            {task.status}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${priorityClass(task.priority, styles)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td>
                          <div className={styles.metric}>
                            <strong>{task.progress}</strong>
                            <div className={styles.progressTrack}>
                              <div className={styles.progressFill} style={{ width: `${progressValue}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.inlineMeta}>
                            <CalendarDays size={14} />
                            {formatDueDate(task.due_date)}
                          </div>
                        </td>
                        <td className={styles.muted}>v{task.version}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onEdit(task.task_id)}>
                              Edit
                            </button>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onDelete(task.task_id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {filteredTasks.map((task) => {
              const assignees = splitCsv(task.assignees);
              const progressValue = Number(String(task.progress || '0').replace('%', '')) || 0;

              return (
                <div key={task.task_id} className={styles.mobileCard}>
                  <div className={styles.mobileTop}>
                    <div>
                      <span className={styles.code}>{task.task_id}</span>
                      <h3 className={styles.mobileTitle}>{task.task_name}</h3>
                    </div>
                    <span className={`${styles.badge} ${priorityClass(task.priority, styles)}`}>{task.priority}</span>
                  </div>

                  <div className={styles.assigneeList}>
                    {assignees.length > 0 ? (
                      assignees.map((assignee) => (
                        <span key={assignee} className={styles.assigneeChip}>
                          <Users size={12} />
                          {assignee}
                        </span>
                      ))
                    ) : (
                      <span className={styles.muted}>Unassigned</span>
                    )}
                  </div>

                  <div className={styles.mobileMeta}>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Project</div>
                      <div className={styles.mobileMetaValue}>{task.project_id}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Status</div>
                      <div className={styles.mobileMetaValue}>{task.status}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Due</div>
                      <div className={styles.mobileMetaValue}>{formatDueDate(task.due_date)}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Version</div>
                      <div className={styles.mobileMetaValue}>v{task.version}</div>
                    </div>
                  </div>

                  <div className={styles.stack} style={{ marginTop: 14 }}>
                    <div className={styles.inlineMeta}>
                      <NotebookText size={14} />
                      {preview(task.notes || 'Belum ada notes.', 70)}
                    </div>
                    <div className={styles.inlineMeta}>
                      <FileText size={14} />
                      {preview(task.brief || 'Belum ada brief.', 70)}
                    </div>
                    {task.url ? (
                      <div className={styles.inlineMeta}>
                        <Link2 size={14} />
                        {task.url.split('\n').filter(Boolean).length} link attached
                      </div>
                    ) : null}
                    <div className={styles.metric}>
                      <strong>{task.progress}</strong>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progressValue}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className={styles.mobileActions}>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onEdit(task.task_id)}>
                      Edit
                    </button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(task.task_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
