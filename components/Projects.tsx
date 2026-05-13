'use client';

import { Briefcase, Link2, Users } from 'lucide-react';
import { useState } from 'react';
import styles from './DataTable.module.css';

interface ProjectsProps {
  projects: any[];
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

function preview(value?: string | null, max = 88) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function Projects({ projects, onEdit, onDelete, currentUser, activeFilter, onFilterChange }: ProjectsProps) {
  const [internalFilter, setInternalFilter] = useState<'all' | 'mine'>('all');
  const filter = (activeFilter as 'all' | 'mine') ?? internalFilter;
  const setFilter = (v: 'all' | 'mine') => { setInternalFilter(v); onFilterChange?.(v); };

  // Show loading state if projects is undefined or null
  if (!projects) {
    return (
      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.titleGroup}>
            <h2>All Projects</h2>
            <p>Lihat project, PIC, kategori, progress, dan brief dalam satu tampilan yang lebih rapi.</p>
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
            <p>Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredProjects = filter === 'mine'
    ? projects.filter((project) => {
        const assignees = splitCsv(project.assignees);
        return (
          project.owner?.toLowerCase() === currentUser?.toLowerCase() ||
          assignees.some((assignee) => assignee.toLowerCase() === currentUser?.toLowerCase())
        );
      })
    : projects;

  const emptyMessage = filter === 'mine'
    ? 'Belum ada project yang terkait dengan kamu.'
    : 'Belum ada project.';

  return (
    <div className={styles.card}>
      <div className={styles.filterBar}>
        <div className={styles.titleGroup}>
          <h2>All Projects</h2>
          <p>Lihat project, PIC, kategori, progress, dan brief dalam satu tampilan yang lebih rapi.</p>
        </div>
        <div className={styles.filterButtons}>
          <button className={`${styles.btn} ${styles.btnSm} ${filter === 'all' ? styles.btnPrimary : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={`${styles.btn} ${styles.btnSm} ${filter === 'mine' ? styles.btnPrimary : ''}`} onClick={() => setFilter('mine')}>
            My Projects
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className={styles.emptyState}>{emptyMessage}</div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>PIC</th>
                    <th>Assignees</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Tasks</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const assignees = splitCsv(project.assignees);

                    return (
                      <tr key={project.project_id}>
                        <td><span className={styles.code}>{project.project_id}</span></td>
                        <td className={styles.primaryCell}>
                          <div className={styles.primaryTitle}>{project.project_name}</div>
                          <div className={styles.previewText}>{preview(project.brief || project.notes || 'Belum ada brief.')}</div>
                          {project.url ? (
                            <div className={styles.inlineMeta}>
                              <Link2 size={14} />
                              {project.url.split('\n').filter(Boolean).length} link
                            </div>
                          ) : null}
                        </td>
                        <td><strong>{project.category}</strong></td>
                        <td>{project.owner || <span className={styles.muted}>Unassigned</span>}</td>
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
                          <span className={`${styles.badge} ${project.status === 'Closed' ? styles.badgeDone : styles.badgeActive}`}>
                            {project.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.metric}>
                            <strong>{Number(project.progress || 0).toFixed(1)}%</strong>
                            <div className={styles.progressTrack}>
                              <div className={styles.progressFill} style={{ width: `${Number(project.progress || 0)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td><strong>{project.task_count || 0}</strong></td>
                        <td className={styles.muted}>v{project.version}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onEdit(project.project_id)}>
                              Edit
                            </button>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onDelete(project.project_id)}>
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
            {filteredProjects.map((project) => {
              const assignees = splitCsv(project.assignees);
              const progressValue = Number(project.progress || 0);

              return (
                <div key={project.project_id} className={styles.mobileCard}>
                  <div className={styles.mobileTop}>
                    <div>
                      <span className={styles.code}>{project.project_id}</span>
                      <h3 className={styles.mobileTitle}>{project.project_name}</h3>
                    </div>
                    <span className={`${styles.badge} ${project.status === 'Closed' ? styles.badgeDone : styles.badgeActive}`}>
                      {project.status}
                    </span>
                  </div>

                  <div className={styles.inlineMeta}>
                      <Briefcase size={14} />
                    {preview(project.brief || project.notes || 'Belum ada brief.', 80)}
                  </div>

                  <div className={styles.assigneeList} style={{ marginTop: 12 }}>
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
                      <div className={styles.mobileMetaLabel}>Category</div>
                      <div className={styles.mobileMetaValue}>{project.category}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>PIC</div>
                      <div className={styles.mobileMetaValue}>{project.owner || 'Unassigned'}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Tasks</div>
                      <div className={styles.mobileMetaValue}>{project.task_count || 0}</div>
                    </div>
                    <div className={styles.mobileMetaItem}>
                      <div className={styles.mobileMetaLabel}>Version</div>
                      <div className={styles.mobileMetaValue}>v{project.version}</div>
                    </div>
                  </div>

                  <div className={styles.metric} style={{ marginTop: 14 }}>
                    <strong>{progressValue.toFixed(1)}%</strong>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${progressValue}%` }} />
                    </div>
                  </div>

                  {project.url ? (
                    <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
                      <Link2 size={14} />
                      {project.url.split('\n').filter(Boolean).length} link attached
                    </div>
                  ) : null}

                  <div className={styles.mobileActions}>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onEdit(project.project_id)}>
                      Edit
                    </button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(project.project_id)}>
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
