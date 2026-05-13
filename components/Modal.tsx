'use client';

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, CalendarDays, CheckCheck, FolderOpen, Target, UserRound, Users, X, Sparkles, Wand2, Undo2, Redo2, Minimize2, GitBranch } from 'lucide-react';
import ExpandableTextarea from './ExpandableTextarea';
import WorkflowTimeline from './projects/WorkflowTimeline';
import styles from './Modal.module.css';

interface ModalProps {
  type: 'task' | 'project';
  editId: string | null;
  data: any;
  config: any;
  currentUser?: string;
  initialValues?: Record<string, any> | null;
  onClose: () => void;
  onSave: (formData: any) => void | Promise<void>;
  onMinimize?: () => void;
}

function splitCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Modal({
  type,
  editId,
  data,
  config,
  currentUser,
  initialValues,
  onClose,
  onSave,
  onMinimize
}: ModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workflow'>('details');
  const [workflow, setWorkflow] = useState<any>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const isTask = type === 'task';
  const isProject = type === 'project';
  const showWorkflowTab = isProject && editId; // Only show workflow tab for existing projects
  const baseTeamOptions = useMemo(() => {
    const team = config?.team || [];
    // Handle both string array and object array formats
    return team.map((member: any) => {
      if (typeof member === 'string') {
        return member;
      }
      // If it's an object, extract the username/value
      return member.value || member.username || member;
    });
  }, [config]);
  const teamMemberMeta = useMemo(() => {
    const map = new Map<string, { fullName?: string; jobPosition?: string }>();
    for (const member of config?.team || []) {
      if (typeof member === 'string') continue;
      const key = member?.value || member?.username;
      if (!key) continue;
      map.set(key, {
        fullName: member.full_name,
        jobPosition: member.job_position
      });
    }
    return map;
  }, [config]);
  const projectOptions = useMemo(
    () => config?.projectOptions || (config?.projects || []).map((projectId: string) => ({
      project_id: projectId,
      project_name: projectId
    })),
    [config]
  );

  // Draft key for localStorage
  const draftKey = `modal-draft-${type}-${editId || 'new'}`;

  // Save draft to localStorage
  const saveDraft = (data: any) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      setIsDraft(true);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const { data: draftData, timestamp } = JSON.parse(saved);
        // Only load if draft is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return draftData;
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  };

  // Clear draft from localStorage
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      setIsDraft(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  // Handle minimize
  const handleMinimize = () => {
    saveDraft(formData);
    if (onMinimize) {
      onMinimize();
    } else {
      onClose();
    }
  };

  const sourceItem = useMemo(() => {
    if (!editId) return null;
    return isTask
      ? data.tasks.find((task: any) => task.task_id === editId)
      : data.projects.find((project: any) => project.project_id === editId);
  }, [data.projects, data.tasks, editId, isTask]);

  useEffect(() => {
    // Try to load draft first
    const draft = loadDraft();
    
    if (sourceItem) {
      const initialData = isTask
        ? {
            task_name: sourceItem.task_name,
            project_id: sourceItem.project_id,
            assignees: splitCsv(sourceItem.assignees),
            status: sourceItem.status,
            priority: sourceItem.priority,
            progress: sourceItem.progress,
            due_date: sourceItem.due_date ? sourceItem.due_date.split('T')[0] : '',
            notes: sourceItem.notes || '',
            url: sourceItem.url || '',
            brief: sourceItem.brief || ''
          }
        : {
            project_name: sourceItem.project_name,
            category: sourceItem.category,
            owner: sourceItem.owner || splitCsv(sourceItem.assignees)[0] || currentUser || baseTeamOptions[0] || '',
            assignees: splitCsv(sourceItem.assignees),
            status: sourceItem.status,
            notes: sourceItem.notes || '',
            url: sourceItem.url || '',
            brief: sourceItem.brief || ''
          };
      
      // Use draft if available, otherwise use source data
      const dataToUse = draft || initialData;
      setFormData(dataToUse);
      setHistory([dataToUse]);
      setHistoryIndex(0);
      return;
    }

    const baseForm = isTask
      ? {
          task_name: '',
          project_id: projectOptions[0]?.project_id || config?.projects?.[0] || '',
          assignees: currentUser ? [currentUser] : [] as string[],
          status: config?.defaults?.default_status || 'Backlog',
          priority: config?.defaults?.default_priority || 'Normal',
          progress: config?.defaults?.default_progress || '0%',
          due_date: '',
          notes: '',
          url: '',
          brief: ''
        }
      : {
          project_name: '',
          category: config?.defaults?.default_category || (config?.categories?.[0] ? (typeof config.categories[0] === 'string' ? config.categories[0] : config.categories[0].value) : ''),
          owner: currentUser || baseTeamOptions[0] || '',
          assignees: currentUser ? [currentUser] : [],
          status: 'Planning',
          notes: '',
          url: '',
          brief: ''
        };

    const normalizedInitialValues = initialValues
      ? {
          ...initialValues,
          assignees: Array.isArray(initialValues.assignees)
            ? initialValues.assignees
            : splitCsv(initialValues.assignees)
        }
      : null;

    const nextFormData = {
      ...baseForm,
      ...normalizedInitialValues
    };

    if (!isTask && nextFormData.owner && !nextFormData.assignees.includes(nextFormData.owner)) {
      nextFormData.assignees = [...nextFormData.assignees, nextFormData.owner];
    }

    // Use draft if available, otherwise use default
    const dataToUse = draft || nextFormData;
    setFormData(dataToUse);
    setHistory([dataToUse]);
    setHistoryIndex(0);
  }, [baseTeamOptions, config, currentUser, initialValues, isTask, projectOptions, sourceItem]);

  const briefChanged = Boolean(
    editId &&
      sourceItem &&
      (formData.brief || '') !== ((sourceItem.brief as string | undefined) || '')
  );

  // Load workflow for existing projects
  useEffect(() => {
    if (showWorkflowTab && activeTab === 'workflow') {
      loadWorkflow();
    }
  }, [showWorkflowTab, activeTab, editId]);

  const loadWorkflow = async () => {
    if (!editId) return;
    setWorkflowLoading(true);
    try {
      const res = await fetch(`/api/projects/${editId}/workflow`);
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.workflow);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const createWorkflow = async () => {
    if (!editId) return;
    setWorkflowLoading(true);
    try {
      const res = await fetch(`/api/projects/${editId}/workflow`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert('Workflow created successfully!');
        await loadWorkflow();
      } else {
        alert('Failed to create workflow: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Error creating workflow');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const updateWorkflowStatus = async (stageId: string, status: string, notes?: string) => {
    if (!editId) return;
    try {
      const res = await fetch(`/api/projects/${editId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, status, notes })
      });
      const data = await res.json();
      if (data.success) {
        await loadWorkflow();
      } else {
        alert('Failed to update workflow: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to update workflow:', error);
      alert('Error updating workflow');
    }
  };

  const selectedAssignees = useMemo(() => {
    return Array.isArray(formData.assignees) ? formData.assignees : [];
  }, [formData.assignees]);
  const teamOptions = useMemo(() => {
    const next = new Set<string>();
    baseTeamOptions.forEach((item: string) => { if (item) next.add(item); });
    selectedAssignees.forEach((item: string) => { if (item) next.add(item); });
    if (formData.owner) next.add(formData.owner);
    if (currentUser) next.add(currentUser);
    return Array.from(next);
  }, [baseTeamOptions, currentUser, formData.owner, selectedAssignees]);
  const getMemberLabel = (member: string) => {
    const meta = teamMemberMeta.get(member);
    if (!meta?.fullName) return member;
    return meta.fullName === member ? meta.fullName : `${meta.fullName} (@${member})`;
  };

  const setField = (name: string, value: string | string[]) => {
    setFormData((current: any) => {
      const next = { ...current, [name]: value };
      // Save to history for undo/redo
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
      setHistoryIndex((prev) => prev + 1);
      // Auto-save draft
      saveDraft(next);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setFormData(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setFormData(history[historyIndex + 1]);
    }
  };

  const handleAIEnhance = async (field: string) => {
    const titleField = isTask ? 'task_name' : 'project_name';
    const title = formData[titleField] || '';
    
    if (!title.trim()) {
      alert('Please enter a ' + (isTask ? 'task' : 'project') + ' name first');
      return;
    }

    setAiLoading(field);
    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhance',
          field,
          value: formData[field] || '',
          context: {
            type: isTask ? 'task' : 'project',
            title,
            currentData: formData
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setField(field, result.result);
      } else {
        alert('AI enhancement failed: ' + result.error);
      }
    } catch (error) {
      console.error('AI enhance error:', error);
      alert('Failed to enhance content');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAIAutoFill = async () => {
    const titleField = isTask ? 'task_name' : 'project_name';
    const title = formData[titleField] || '';
    
    if (!title.trim()) {
      alert('Please enter a ' + (isTask ? 'task' : 'project') + ' name first');
      return;
    }

    setAiLoading('autofill');
    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'autofill',
          context: {
            type: isTask ? 'task' : 'project',
            title,
            currentData: formData
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        // Apply all fields from AI
        const newFormData = { ...formData, ...result.result };
        setFormData(newFormData);
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), newFormData]);
        setHistoryIndex((prev) => prev + 1);
      } else {
        alert('AI auto-fill failed: ' + result.error);
      }
    } catch (error) {
      console.error('AI autofill error:', error);
      alert('Failed to auto-fill form');
    } finally {
      setAiLoading(null);
    }
  };

  const toggleAssignee = (assignee: string) => {
    const exists = selectedAssignees.includes(assignee);
    const nextAssignees = exists
      ? selectedAssignees.filter((item: string) => item !== assignee)
      : [...selectedAssignees, assignee];

    setFormData((current: any) => {
      const nextOwner =
        !isTask && current.owner === assignee && exists
          ? nextAssignees[0] || ''
          : current.owner || (!isTask && !exists ? assignee : '');

      return {
        ...current,
        assignees: nextAssignees,
        owner: isTask ? current.owner : nextOwner
      };
    });
  };

  const handleOwnerChange = (owner: string) => {
    setFormData((current: any) => ({
      ...current,
      owner,
      assignees: owner && !current.assignees.includes(owner)
        ? [...current.assignees, owner]
        : current.assignees
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const submitData = {
      ...formData,
      assignees: selectedAssignees.join(', '),
      owner: isTask ? undefined : formData.owner || selectedAssignees[0] || currentUser || ''
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(submitData));
      clearDraft();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = `${editId ? 'Edit' : 'New'} ${isTask ? 'Task' : 'Project'}`;
  const subtitle = isTask
    ? 'Atur detail task dengan struktur yang rapi dan mudah discan.'
    : 'Simpan project dengan owner, assignees, dan status yang konsisten.';

  return (
    <div className={styles.modal} onClick={handleMinimize}>
      <div className={styles.content} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.eyebrow}>
              {isTask ? 'Task Workflow' : 'Project Workspace'}
              {isDraft && <span className={styles.draftBadge}>Draft Saved</span>}
            </div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className={styles.aiBtn}
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo"
              style={{ opacity: historyIndex <= 0 ? 0.3 : 1 }}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className={styles.aiBtn}
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              style={{ opacity: historyIndex >= history.length - 1 ? 0.3 : 1 }}
            >
              <Redo2 size={16} />
            </button>
            <button
              type="button"
              className={styles.aiAutoFillBtn}
              onClick={handleAIAutoFill}
              disabled={aiLoading === 'autofill'}
            >
              <Wand2 size={14} />
              {aiLoading === 'autofill' ? 'Filling...' : 'AI Fill'}
            </button>
            <button 
              type="button" 
              className={styles.minimizeBtn} 
              onClick={handleMinimize} 
              title="Minimize (save draft)"
            >
              <Minimize2 size={18} />
            </button>
            <button type="button" className={styles.closeBtn} onClick={handleMinimize} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs for Project Modal */}
        {showWorkflowTab && (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '0 24px',
            borderBottom: '1px solid rgba(226,232,240,0.8)',
            background: '#F9FAFB'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'details' ? '2px solid #7c3aed' : '2px solid transparent',
                color: activeTab === 'details' ? '#7c3aed' : '#6B7280',
                fontWeight: activeTab === 'details' ? 700 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Briefcase size={14} />
              Project Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('workflow')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'workflow' ? '2px solid #7c3aed' : '2px solid transparent',
                color: activeTab === 'workflow' ? '#7c3aed' : '#6B7280',
                fontWeight: activeTab === 'workflow' ? 700 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <GitBranch size={14} />
              Workflow
              {workflow && workflow.stages && (
                <span style={{
                  padding: '2px 8px',
                  background: 'rgba(124,58,237,0.1)',
                  color: '#7c3aed',
                  borderRadius: 999,
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {workflow.progress}%
                </span>
              )}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {activeTab === 'details' ? (
          <div className={styles.body}>
            {isTask ? (
              <>
                <div className={styles.formGroup}>
                  <label>Task Name</label>
                  <div className={styles.inputWrap}>
                    <CheckCheck size={16} />
                    <input
                      name="task_name"
                      value={formData.task_name || ''}
                      onChange={(event) => setField('task_name', event.target.value)}
                      placeholder="Contoh: Validasi flow checkout mobile"
                      required
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Project</label>
                    <div className={styles.inputWrap}>
                      <FolderOpen size={16} />
                      <select
                        name="project_id"
                        value={formData.project_id || ''}
                        onChange={(event) => setField('project_id', event.target.value)}
                        required
                      >
                        {projectOptions.map((project: any) => (
                          <option key={project.project_id} value={project.project_id}>
                            {project.project_name} ({project.project_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Due Date</label>
                    <div className={styles.inputWrap}>
                      <CalendarDays size={16} />
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date || ''}
                        onChange={(event) => setField('due_date', event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Assignees</label>
                  <div className={styles.selectionCard}>
                    <div className={styles.selectionHeader}>
                      <span>Pilih satu atau lebih anggota team</span>
                      <strong>{selectedAssignees.length} selected</strong>
                    </div>
                    <div className={styles.optionGrid}>
                      {teamOptions.map((member: string) => {
                        const active = selectedAssignees.includes(member);
                        return (
                          <button
                            key={member}
                            type="button"
                            className={`${styles.optionChip} ${active ? styles.optionChipActive : ''}`}
                            onClick={() => toggleAssignee(member)}
                          >
                            <Users size={14} />
                            <span>{getMemberLabel(member)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.grid3}>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status || ''}
                      onChange={(event) => setField('status', event.target.value)}
                    >
                      {(config?.status || []).map((status: string) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority || ''}
                      onChange={(event) => setField('priority', event.target.value)}
                    >
                      {(config?.priority || []).map((priority: string) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Progress</label>
                    <select
                      name="progress"
                      value={formData.progress || ''}
                      onChange={(event) => setField('progress', event.target.value)}
                    >
                      {(config?.progress || []).map((progress: string) => (
                        <option key={progress} value={progress}>{progress}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label>Project Name</label>
                  <div className={styles.inputWrap}>
                    <Briefcase size={16} />
                    <input
                      name="project_name"
                      value={formData.project_name || ''}
                      onChange={(event) => setField('project_name', event.target.value)}
                      placeholder="Contoh: PWA Dashboard Refresh"
                      required
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <div className={styles.inputWrap}>
                      <FolderOpen size={16} />
                      <select
                        name="category"
                        value={formData.category || ''}
                        onChange={(event) => setField('category', event.target.value)}
                        required
                      >
                        {(config?.categories || []).map((category: any) => {
                          const categoryValue = typeof category === 'string' ? category : category.value;
                          return (
                            <option key={categoryValue} value={categoryValue}>{categoryValue}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Owner / Lead</label>
                    <div className={styles.inputWrap}>
                      <UserRound size={16} />
                      <select
                        name="owner"
                        value={formData.owner || ''}
                        onChange={(event) => handleOwnerChange(event.target.value)}
                      >
                        <option value="">Select owner</option>
                        {teamOptions.map((member: string) => (
                          <option key={member} value={member}>{getMemberLabel(member)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Assignees</label>
                  <div className={styles.selectionCard}>
                    <div className={styles.selectionHeader}>
                      <span>Owner otomatis ikut assignees jika belum terpilih</span>
                      <strong>{selectedAssignees.length} selected</strong>
                    </div>
                    <div className={styles.optionGrid}>
                      {teamOptions.map((member: string) => {
                        const active = selectedAssignees.includes(member);
                        return (
                          <button
                            key={member}
                            type="button"
                            className={`${styles.optionChip} ${active ? styles.optionChipActive : ''}`}
                            onClick={() => toggleAssignee(member)}
                          >
                            <Users size={14} />
                            <span>{getMemberLabel(member)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status || ''}
                      onChange={(event) => setField('status', event.target.value)}
                    >
                      <option value="Planning">Planning</option>
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Project Lead</label>
                    <select
                      value={formData.owner || ''}
                      disabled
                      style={{ 
                        background: 'rgba(124, 58, 237, 0.05)', 
                        border: '1px solid rgba(124, 58, 237, 0.2)', 
                        color: '#7c3aed',
                        fontWeight: 600,
                        cursor: 'default',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        paddingRight: '12px'
                      }}
                    >
                      <option value={formData.owner || ''}>{formData.owner ? getMemberLabel(formData.owner) : 'Belum dipilih'}</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <ExpandableTextarea
              label="Notes"
              value={formData.notes || ''}
              onChange={(value) => setField('notes', value)}
              placeholder="Tambahkan konteks, blockers, atau detail penting."
              rows={3}
              aiEnhanceButton={
                <button
                  type="button"
                  className={styles.aiEnhanceBtn}
                  onClick={() => handleAIEnhance('notes')}
                  disabled={aiLoading === 'notes'}
                  title="AI Enhance - Generate or improve notes"
                >
                  <Sparkles size={12} />
                  {aiLoading === 'notes' ? 'Enhancing...' : 'AI Enhance'}
                </button>
              }
            />

            <ExpandableTextarea
              label="URL / Lampiran"
              value={formData.url || ''}
              onChange={(value) => setField('url', value)}
              placeholder="Pisahkan beberapa link dengan baris baru."
              rows={2}
              aiEnhanceButton={
                <button
                  type="button"
                  className={styles.aiEnhanceBtn}
                  onClick={() => handleAIEnhance('url')}
                  disabled={aiLoading === 'url'}
                  title="AI Enhance - Suggest relevant URLs"
                >
                  <Sparkles size={12} />
                  {aiLoading === 'url' ? 'Enhancing...' : 'AI Enhance'}
                </button>
              }
            />

            <ExpandableTextarea
              label={`Brief / Revisi ${briefChanged ? '(version akan bertambah)' : ''}`}
              value={formData.brief || ''}
              onChange={(value) => setField('brief', value)}
              placeholder="Tulis brief utama, acceptance criteria, atau ringkasan revisi."
              rows={4}
              icon={<Target size={16} />}
              aiEnhanceButton={
                <button
                  type="button"
                  className={styles.aiEnhanceBtn}
                  onClick={() => handleAIEnhance('brief')}
                  disabled={aiLoading === 'brief'}
                  title="AI Enhance - Generate or improve brief"
                >
                  <Sparkles size={12} />
                  {aiLoading === 'brief' ? 'Enhancing...' : 'AI Enhance'}
                </button>
              }
            />
          </div>
          ) : (
          /* Workflow Tab */
          <div className={styles.body} style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
            {workflowLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ marginBottom: 12 }}>Loading workflow...</div>
              </div>
            ) : !workflow || !workflow.stages || workflow.stages.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <GitBranch size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
                  No Workflow Yet
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: 24, fontFamily: 'DM Sans, sans-serif' }}>
                  Create a workflow to track this project&rsquo;s progress through different stages.
                </p>
                <button
                  type="button"
                  onClick={createWorkflow}
                  disabled={workflowLoading}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <GitBranch size={16} />
                  {workflowLoading ? 'Creating...' : 'Create Workflow'}
                </button>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 12, fontFamily: 'DM Sans, sans-serif' }}>
                  Workflow will be created based on project category: <strong>{formData.category}</strong>
                </p>
              </div>
            ) : (
              <WorkflowTimeline
                stages={workflow.stages}
                onUpdateStatus={updateWorkflowStatus}
              />
            )}
          </div>
          )}

          <div className={styles.footer}>
            {activeTab === 'details' ? (
              <>
            <button type="button" className={styles.btn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            {isTask && editId && formData.due_date && (
              <button
                type="button"
                className={styles.btn}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    await fetch('/api/calendar', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: formData.task_name,
                        event_type: 'task',
                        start_at: formData.due_date,
                        end_at: formData.due_date,
                        all_day: true,
                        color: formData.priority === 'Urgent' ? '#ef4444' : formData.priority === 'High' ? '#f97316' : '#7c3aed',
                        task_id: editId,
                        project_id: formData.project_id,
                        description: `${formData.status} • ${formData.priority} • ${formData.progress}`
                      })
                    });
                    alert('Added to Calendar!');
                  } catch {}
                }}
              >
                <CalendarDays size={14} /> Add to Calendar
              </button>
            )}
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editId ? 'Save Changes' : `Create ${isTask ? 'Task' : 'Project'}`}
            </button>
              </>
            ) : (
              <button type="button" className={styles.btn} onClick={onClose} disabled={isSubmitting}>
                Close
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
