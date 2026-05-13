'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Briefcase, ListTodo, Plus, X, Calendar, Users, Flag, TrendingUp, Clock, Edit2, Trash2 } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import Modal from '@/components/Modal';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';
import styles from './Calendar.module.css';

type ViewType = 'month' | 'week' | 'day';
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function parseLocal(val: string|Date|null|undefined): Date|null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate()+n); return r;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

interface TaskItem {
  kind: 'task';
  id: string; rawId: string; title: string;
  dueDate: Date;
  status: string; priority: string; progress: string;
  projectId: string;
}

interface ProjectItem {
  kind: 'project';
  id: string; rawId: string; title: string;
  startDate: Date; dueDate: Date;
  status: string; progress: number;
}

type CalItem = TaskItem | ProjectItem;

function priorityColor(p?: string) {
  if (p==='Urgent') return '#ef4444';
  if (p==='High') return '#f97316';
  if (p==='Low') return '#10b981';
  if (p==='Recurring') return '#6366f1';
  return '#7c3aed';
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, data, config, authChecked, toast, handleLogout, loadData, loadConfig, showToast } = useApp();

  const [view, setView] = useState<ViewType>('month');
  const [current, setCurrent] = useState(new Date());
  const [miniCurrent, setMiniCurrent] = useState(new Date());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dragOver, setDragOver] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'task'|'project'>('task');
  const [modalInitial, setModalInitial] = useState<Record<string,any>|null>(null);
  const [modalEditId, setModalEditId] = useState<string|null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuDate, setAddMenuDate] = useState<Date|null>(null);
  const [addMenuPos, setAddMenuPos] = useState<{x:number;y:number}>({x:0,y:0});

  const dragTaskRef = useRef<TaskItem|null>(null);
  const resizeRef = useRef<{projId:string;side:'start'|'end';startX:number;origStart:Date;origEnd:Date;cellWidth:number}|null>(null);

  useEffect(() => {
    if (!data) return;
    const t: TaskItem[] = [];
    for (const task of data.tasks ?? []) {
      const d = parseLocal(task.due_date);
      if (!d) continue;
      t.push({ kind:'task', id:`task-${task.task_id}`, rawId:task.task_id, title:task.task_name,
        dueDate:d, status:task.status, priority:task.priority, progress:task.progress, projectId:task.project_id });
    }
    setTasks(t);

    const p: ProjectItem[] = [];
    for (const proj of data.projects ?? []) {
      const due = parseLocal(proj.due_date);
      if (!due) continue;
      const start = parseLocal(proj.start_date) ?? due;
      p.push({ kind:'project', id:`proj-${proj.project_id}`, rawId:proj.project_id,
        title:proj.project_name, startDate:start, dueDate:due,
        status:proj.status, progress:proj.progress ?? 0 });
    }
    setProjects(p);
  }, [data]);

  const navigate = (dir: number) => {
    const d = new Date(current);
    if (view==='month') d.setMonth(d.getMonth()+dir);
    else if (view==='week') d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setCurrent(d);
  };

  const navigateMini = (dir: number) => {
    const d = new Date(miniCurrent); d.setMonth(d.getMonth()+dir); setMiniCurrent(d);
  };

  const getTasksForDay = (date: Date) => tasks.filter(t => isSameDay(t.dueDate, date));

  const getProjectsStartingOnDay = (date: Date) => projects.filter(p => isSameDay(p.startDate, date));

  const onTaskDragStart = (item: TaskItem) => { dragTaskRef.current = item; };
  
  const onDragOver = (e: React.DragEvent, dateStr: string) => { 
    e.preventDefault(); 
    setDragOver(dateStr);
  };
  
  const onDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOver(null);
    const item = dragTaskRef.current;
    if (!item || isSameDay(item.dueDate, targetDate)) return;
    const dateStr = toDateStr(targetDate);
    try {
      const res = await fetch(`/api/tasks/${item.rawId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ due_date: dateStr })
      });
      const json = await res.json();
      if (json.success) { showToast(`Due date → ${dateStr}`, 'success'); await loadData(); }
      else showToast(json.error || 'Error', 'error');
    } catch { showToast('Error updating due date', 'error'); }
    dragTaskRef.current = null;
  };

  const onResizeStart = (e: React.MouseEvent, proj: ProjectItem, side: 'start'|'end') => {
    e.preventDefault(); e.stopPropagation();
    
    // Get the day cell width for accurate calculation
    const dayCell = (e.currentTarget as HTMLElement).closest('.Calendar_dayCell__ot1Qi');
    const cellWidth = dayCell ? dayCell.getBoundingClientRect().width : 100;
    
    resizeRef.current = { 
      projId: proj.rawId, 
      side, 
      startX: e.clientX, 
      origStart: new Date(proj.startDate),
      origEnd: new Date(proj.dueDate),
      cellWidth
    };
    
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const daysDelta = Math.round(dx / resizeRef.current.cellWidth);
      
      setProjects(prev => prev.map(p => {
        if (p.rawId !== proj.rawId) return p;
        if (resizeRef.current!.side === 'start') {
          const newStart = addDays(resizeRef.current!.origStart, daysDelta);
          // Don't allow start to go past end
          if (newStart <= resizeRef.current!.origEnd) {
            return { ...p, startDate: newStart };
          }
        } else {
          const newEnd = addDays(resizeRef.current!.origEnd, daysDelta);
          // Don't allow end to go before start
          if (newEnd >= resizeRef.current!.origStart) {
            return { ...p, dueDate: newEnd };
          }
        }
        return p;
      }));
    };
    
    const onUp = async (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!resizeRef.current) return;
      
      const dx = ev.clientX - resizeRef.current.startX;
      const daysDelta = Math.round(dx / resizeRef.current.cellWidth);
      if (daysDelta === 0) { resizeRef.current = null; return; }
      
      try {
        const updateData: any = {};
        if (resizeRef.current.side === 'start') {
          const newStart = addDays(resizeRef.current.origStart, daysDelta);
          updateData.start_date = toDateStr(newStart);
        } else {
          const newEnd = addDays(resizeRef.current.origEnd, daysDelta);
          updateData.due_date = toDateStr(newEnd);
        }
        
        const res = await fetch(`/api/projects/${resizeRef.current.projId}`, {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(updateData)
        });
        const json = await res.json();
        if (json.success) { 
          showToast(`Project ${resizeRef.current.side === 'start' ? 'start' : 'end'} date updated`, 'success'); 
          await loadData(); 
        }
        else showToast(json.error || 'Error', 'error');
      } catch { showToast('Error updating project', 'error'); }
      resizeRef.current = null;
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const openModal = (type: 'task'|'project', date: Date | null, editId?: string) => {
    setModalType(type);
    if (editId) {
      setModalEditId(editId);
      setModalInitial(null);
    } else {
      setModalEditId(null);
      setModalInitial(date ? (type==='task' ? { due_date: toDateStr(date) } : { start_date: toDateStr(date) }) : null);
    }
    setModalOpen(true);
    setAddMenuOpen(false);
  };

  const showAddMenu = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAddMenuPos({ x: rect.left, y: rect.bottom + 5 });
    setAddMenuDate(date);
    setAddMenuOpen(true);
  };

  const hideAddMenu = () => {
    setAddMenuOpen(false);
    setAddMenuDate(null);
  };

  const handleSave = async (formData: any) => {
    try {
      const isEdit = !!modalEditId;
      const endpoint = isEdit 
        ? (modalType==='task' ? `/api/tasks/${modalEditId}` : `/api/projects/${modalEditId}`)
        : (modalType==='task' ? '/api/tasks' : '/api/projects');
      
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(endpoint, { 
        method, 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify(formData) 
      });
      const json = await res.json();
      
      if (json.success) {
        showToast(`${modalType==='task'?'Task':'Project'} ${isEdit?'updated':'created'}!`, 'success');
        setModalOpen(false);
        setModalEditId(null);
        await loadData();
        if (modalType==='project') await loadConfig();
      } else {
        showToast(`Error: ${json.error}`, 'error');
      }
    } catch { 
      showToast('Error saving', 'error'); 
    }
  };

  // Popup state for preview
  const [popupItem, setPopupItem] = useState<CalItem|null>(null);
  const [popupPos, setPopupPos] = useState<{x:number;y:number}>({x:0,y:0});

  const hidePopup = () => {
    setPopupItem(null);
  };

  const togglePopup = (e: React.MouseEvent, item: CalItem) => {
    e.stopPropagation();
    if (popupItem?.id === item.id) {
      hidePopup();
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopupPos({ x: rect.left, y: rect.bottom + 5 });
      setPopupItem(item);
    }
  };

  const openEditModal = (item: CalItem) => {
    const type = item.kind === 'task' ? 'task' : 'project';
    openModal(type, new Date(), item.rawId);
    setPopupItem(null);
  };

  if (!authChecked) return <PageLoader />;

  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const monthEnd = new Date(current.getFullYear(), current.getMonth()+1, 0);
  const startDate = new Date(monthStart); startDate.setDate(startDate.getDate() - monthStart.getDay());
  const endDate = new Date(monthEnd); endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

  const calendarDays: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
    calendarDays.push(new Date(d));
  }

  return (
    <AppShell 
      activeTab="calendar" 
      user={user} 
      onLogout={handleLogout}
      onNewTask={() => openModal('task', null)}
      onNewProject={() => openModal('project', null)}
    >
      <MobileHeader title="Calendar" user={user} onLogout={handleLogout} />
      <div className={styles.shell}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Mini Calendar */}
          <div className={styles.miniCal}>
            <div className={styles.miniCalHeader}>
              <button className={styles.miniNavBtn} onClick={() => navigateMini(-1)}><ChevronLeft size={14} /></button>
              <span className={styles.miniCalTitle}>{MONTHS[miniCurrent.getMonth()]} {miniCurrent.getFullYear()}</span>
              <button className={styles.miniNavBtn} onClick={() => navigateMini(1)}><ChevronRight size={14} /></button>
            </div>
            <div className={styles.miniCalGrid}>
              {DAYS.map(d => <div key={d} className={styles.miniDayName}>{d[0]}</div>)}
              {Array.from({length: 42}, (_, i) => {
                const firstDay = new Date(miniCurrent.getFullYear(), miniCurrent.getMonth(), 1);
                const startOffset = firstDay.getDay();
                const d = new Date(miniCurrent.getFullYear(), miniCurrent.getMonth(), i - startOffset + 1);
                const isCurrentMonth = d.getMonth() === miniCurrent.getMonth();
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={i}
                    className={`${styles.miniDay} ${!isCurrentMonth ? styles.miniDayOther : ''} ${isToday ? styles.miniDayToday : ''}`}
                    onClick={() => setCurrent(d)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>LEGEND</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#7c3aed'}}></div>Task (Normal)</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#ef4444'}}></div>Task (Urgent)</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#f97316'}}></div>Task (High)</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#10b981'}}></div>Task (Low)</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#6366f1'}}></div>Task (Recurring)</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'#a78bfa'}}></div>Project</div>
          </div>

          {/* Summary */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryTitle}>THIS MONTH</div>
            <div className={styles.summaryRow}><ListTodo size={14} /> {tasks.filter(t => t.dueDate.getMonth() === current.getMonth()).length} tasks due</div>
            <div className={styles.summaryRow}><Briefcase size={14} /> {projects.filter(p => p.dueDate.getMonth() === current.getMonth()).length} projects</div>
          </div>
        </div>

        {/* Main Calendar */}
        <div className={styles.main}>
          {/* Header */}
          <div className={styles.calHeader}>
            <div className={styles.calHeaderLeft}>
              <button className={styles.navBtn} onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
              <h2 className={styles.calTitle}>{MONTHS[current.getMonth()]} {current.getFullYear()}</h2>
              <button className={styles.navBtn} onClick={() => navigate(1)}><ChevronRight size={18} /></button>
            </div>
            <div className={styles.calHeaderRight}>
              <button className={styles.todayBtn} onClick={() => setCurrent(new Date())}>Today</button>
              <div className={styles.viewBtns}>
                <button className={`${styles.viewBtn} ${view==='month' ? styles.viewBtnActive : ''}`} onClick={() => setView('month')}>Month</button>
                <button className={`${styles.viewBtn} ${view==='week' ? styles.viewBtnActive : ''}`} onClick={() => setView('week')}>Week</button>
                <button className={`${styles.viewBtn} ${view==='day' ? styles.viewBtnActive : ''}`} onClick={() => setView('day')}>Day</button>
              </div>
            </div>
          </div>

          {/* Month Grid */}
          {view === 'month' && (
            <div className={styles.monthGrid}>
              <div className={styles.weekHeader}>
                {DAYS.map(d => <div key={d} className={styles.weekHeaderDay}>{d}</div>)}
              </div>
              <div className={styles.monthBody}>
                {Array.from({length: 6}, (_, week) => (
                  <div key={week} className={styles.weekRow}>
                    {Array.from({length: 7}, (_, day) => {
                      const date = new Date(monthStart);
                      date.setDate(date.getDate() + week * 7 + day - monthStart.getDay());
                      const isCurrentMonth = date.getMonth() === current.getMonth();
                      const isToday = isSameDay(date, new Date());
                      const dayTasks = getTasksForDay(date);
                      const dayProjects = getProjectsStartingOnDay(date);
                      const dateStr = toDateStr(date);

                      return (
                        <div
                          key={`${week}-${day}`}
                          className={`${styles.dayCell} ${!isCurrentMonth ? styles.dayCellOther : ''} ${isToday ? styles.dayCellToday : ''} ${dragOver === dateStr ? styles.dayCellDragOver : ''}`}
                          onDragOver={(e) => onDragOver(e, dateStr)}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={(e) => onDrop(e, date)}
                        >
                          <div className={styles.dayCellTop}>
                            <div className={`${styles.dayNum} ${isToday ? styles.dayNumToday : isCurrentMonth ? '' : styles.dayNumOther}`}>{date.getDate()}</div>
                            <button className={styles.addBtn} onClick={(e) => showAddMenu(e, date)} title="Add task or project"><Plus size={14} /></button>
                          </div>
                          <div 
                            className={styles.dayEvents}
                            onClick={(e) => {
                              // Show popup for first item if clicked on empty area
                              const allItems = [...dayProjects, ...dayTasks];
                              if (allItems.length > 0 && e.target === e.currentTarget) {
                                togglePopup(e, allItems[0]);
                              }
                            }}
                          >
                            {dayProjects.map(proj => {
                              const span = daysBetween(proj.startDate, proj.dueDate) + 1;
                              return (
                                <div
                                  key={proj.id}
                                  className={styles.eventChipProject}
                                  style={{
                                    '--chip-color': '#a78bfa',
                                    gridColumn: `span ${Math.min(span, 7 - day)}`
                                  } as any}
                                  onClick={(e) => togglePopup(e, proj)}
                                >
                                  {/* Left resize handle (start date) */}
                                  <div 
                                    style={{
                                      position:'absolute',
                                      left:0,
                                      top:0,
                                      bottom:0,
                                      width:'8px',
                                      cursor:'col-resize',
                                      background:'transparent',
                                      zIndex:10
                                    }}
                                    onMouseDown={(e) => onResizeStart(e, proj, 'start')}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div style={{display:'flex', alignItems:'center', gap:'4px', flex:1, minWidth:0, paddingLeft:'4px'}}>
                                    <Briefcase size={10} />
                                    <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{proj.title}</span>
                                  </div>
                                  {/* Right resize handle (end date) */}
                                  <div 
                                    style={{
                                      position:'absolute',
                                      right:0,
                                      top:0,
                                      bottom:0,
                                      width:'8px',
                                      cursor:'col-resize',
                                      background:'transparent',
                                      zIndex:10
                                    }}
                                    onMouseDown={(e) => onResizeStart(e, proj, 'end')}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              );
                            })}
                            {dayTasks.slice(0, 3).map(task => (
                              <button
                                key={task.id}
                                className={styles.eventChipTask}
                                style={{'--chip-color': priorityColor(task.priority)} as any}
                                draggable
                                onDragStart={() => onTaskDragStart(task)}
                                onClick={(e) => togglePopup(e, task)}
                              >
                                <ListTodo size={10} />
                                <span>{task.title}</span>
                              </button>
                            ))}
                            {dayTasks.length > 3 && <div className={styles.moreEvents}>+{dayTasks.length - 3} more</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week View */}
          {view === 'week' && (
            <div className={styles.weekView}>
              <div className={styles.weekViewHeader}>
                <div className={styles.weekViewCorner}></div>
                {Array.from({length: 7}, (_, i) => {
                  const d = new Date(current);
                  d.setDate(d.getDate() - d.getDay() + i);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={i} className={styles.dayColHeader}>
                      <div className={styles.dayColName}>{DAYS[i]}</div>
                      <div className={`${styles.dayColNum} ${isToday ? styles.dayColNumToday : ''}`}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.weekViewBody}>
                <div className={styles.weekViewAllDay}>
                  <div className={styles.weekViewLabel}>All Day</div>
                  {Array.from({length: 7}, (_, i) => {
                    const d = new Date(current);
                    d.setDate(d.getDate() - d.getDay() + i);
                    const dayTasks = getTasksForDay(d);
                    const dayProjects = getProjectsStartingOnDay(d);
                    return (
                      <div key={i} className={styles.weekDayItems}>
                        {dayProjects.map(proj => (
                          <button key={proj.id} className={styles.eventChip} style={{'--chip-color': '#a78bfa'} as any}>
                            <Briefcase size={10} />
                            <span>{proj.title}</span>
                          </button>
                        ))}
                        {dayTasks.map(task => (
                          <button key={task.id} className={styles.eventChip} style={{'--chip-color': priorityColor(task.priority)} as any} draggable onDragStart={() => onTaskDragStart(task)}>
                            <ListTodo size={10} />
                            <span>{task.title}</span>
                          </button>
                        ))}
                        <button className={styles.weekAddBtn} onClick={() => openModal('task', d)}><Plus size={12} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Day View */}
          {view === 'day' && (
            <div className={styles.dayView}>
              <div className={styles.dayViewHeader}>
                <h3 style={{fontSize:'20px', fontWeight:'700', margin:0}}>{DAYS[current.getDay()]}, {MONTHS[current.getMonth()]} {current.getDate()}</h3>
                <div className={styles.dayAddBtns}>
                  <button className={styles.dayAddBtn} onClick={() => openModal('task', current)}><Plus size={14} /> Add Task</button>
                  <button className={`${styles.dayAddBtn} ${styles.dayAddBtnProject}`} onClick={() => openModal('project', current)}><Plus size={14} /> Add Project</button>
                </div>
              </div>
              <div className={styles.dayViewItems}>
                {getProjectsStartingOnDay(current).map(proj => (
                  <button key={proj.id} className={styles.dayViewItem} style={{'--chip-color': '#a78bfa'} as any}>
                    <div className={styles.dayViewItemIcon}><Briefcase size={16} /></div>
                    <div className={styles.dayViewItemBody}>
                      <div className={styles.dayViewItemTitle}>{proj.title}</div>
                      <div className={styles.dayViewItemMeta}>Project • {toDateStr(proj.startDate)} - {toDateStr(proj.dueDate)}</div>
                    </div>
                  </button>
                ))}
                {getTasksForDay(current).map(task => (
                  <button key={task.id} className={styles.dayViewItem} style={{'--chip-color': priorityColor(task.priority)} as any} draggable onDragStart={() => onTaskDragStart(task)}>
                    <div className={styles.dayViewItemIcon}><ListTodo size={16} /></div>
                    <div className={styles.dayViewItemBody}>
                      <div className={styles.dayViewItemTitle}>{task.title}</div>
                      <div className={styles.dayViewItemMeta}>{task.priority} • {task.status} • {task.progress}</div>
                    </div>
                  </button>
                ))}
                {getTasksForDay(current).length === 0 && getProjectsStartingOnDay(current).length === 0 && (
                  <div className={styles.emptyDay}>No tasks or projects for this day</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Menu Popup */}
      {addMenuOpen && addMenuDate && (
        <>
          <div className={styles.popupOverlay} onClick={hideAddMenu} />
          <div className={styles.addMenu} style={{left: addMenuPos.x, top: addMenuPos.y}}>
            <div className={styles.addMenuDate}>{DAYS[addMenuDate.getDay()]}, {MONTHS[addMenuDate.getMonth()]} {addMenuDate.getDate()}</div>
            <button 
              className={styles.addMenuItem} 
              onClick={() => openModal('task', addMenuDate)}
            >
              <ListTodo size={16} />
              <span>Add Task</span>
            </button>
            <button 
              className={`${styles.addMenuItem} ${styles.addMenuItemProject}`}
              onClick={() => openModal('project', addMenuDate)}
            >
              <Briefcase size={16} />
              <span>Add Project</span>
            </button>
          </div>
        </>
      )}

      {/* Modal Component for Create/Edit */}
      {modalOpen && data && config && (
        <Modal
          type={modalType}
          editId={modalEditId}
          data={data}
          config={config}
          currentUser={user}
          initialValues={modalInitial}
          onClose={() => {
            setModalOpen(false);
            setModalEditId(null);
          }}
          onSave={handleSave}
          onMinimize={() => {
            setModalOpen(false);
            setModalEditId(null);
          }}
        />
      )}

      {/* Popup Preview */}
      {popupItem && (
        <>
          <div className={styles.popupOverlay} onClick={hidePopup} />
          <div className={styles.eventPopup} style={{left: popupPos.x, top: popupPos.y}}>
            <div className={styles.popupHeader}>
              <div className={styles.popupIcon} style={{background: popupItem.kind==='task' ? priorityColor((popupItem as TaskItem).priority) : '#a78bfa', color: 'white'}}>
                {popupItem.kind==='task' ? <ListTodo size={16} /> : <Briefcase size={16} />}
              </div>
              <div className={styles.popupTitleWrap}>
                <div className={styles.popupType}>{popupItem.kind==='task' ? 'TASK' : 'PROJECT'}</div>
                <div className={styles.popupTitle}>{popupItem.title}</div>
              </div>
              <button className={styles.popupClose} onClick={hidePopup}>×</button>
            </div>
            {popupItem.kind==='task' ? (
              <>
                <div className={styles.popupMeta}>
                  <span className={styles.popupBadge} style={{background: priorityColor((popupItem as TaskItem).priority), color: 'white'}}>{(popupItem as TaskItem).priority}</span>
                  <span className={styles.popupBadge} style={{background: '#e2e8f0', color: '#64748b'}}>{(popupItem as TaskItem).status}</span>
                  <span className={styles.popupBadge} style={{background: '#e2e8f0', color: '#64748b'}}>{(popupItem as TaskItem).progress}</span>
                </div>
                <div className={styles.popupProject}><Briefcase size={12} /> {(popupItem as TaskItem).projectId}</div>
                <div className={styles.popupDate}>Due: {toDateStr((popupItem as TaskItem).dueDate)}</div>
              </>
            ) : (
              <>
                <div className={styles.popupMeta}>
                  <span className={styles.popupBadge} style={{background: '#a78bfa', color: 'white'}}>{(popupItem as ProjectItem).status}</span>
                  <span className={styles.popupBadge} style={{background: '#e2e8f0', color: '#64748b'}}>{(popupItem as ProjectItem).progress}%</span>
                </div>
                <div className={styles.popupDate}>
                  {toDateStr((popupItem as ProjectItem).startDate)} → {toDateStr((popupItem as ProjectItem).dueDate)}
                </div>
              </>
            )}
            <button className={styles.popupAction} onClick={() => openEditModal(popupItem)}>
              View Details
            </button>
          </div>
        </>
      )}

      <BottomNav activeTab="calendar" onTabChange={(tab) => router.push(`/${tab}`)} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </AppShell>
  );
}
