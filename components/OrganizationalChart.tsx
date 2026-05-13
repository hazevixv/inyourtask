'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, ChevronDown, ChevronRight, Plus, Edit2, Trash2, GripVertical, Loader2, RefreshCw, User, Award, Package, Briefcase, Factory, Building, Shield, Search, X, Sparkles, Grid3x3 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';
import styles from './OrganizationalChart.module.css';

interface OrgUnit {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_type: 'company' | 'brand' | 'product' | 'division' | 'department' | 'team' | 'unit';
  office_type: string;
  parent_id: number | null;
  level: number;
  path: string;
  sort_order: number;
  owner_username?: string;
  owner_name?: string;
  owner_avatar?: string;
  direksi_username?: string;
  direksi_name?: string;
  direksi_avatar?: string;
  manager_username?: string;
  manager_name?: string;
  manager_avatar?: string;
  description?: string;
  color: string;
  icon: string;
  is_active: number;
  staff_count?: number;
  aggregated_staff_count?: number;
  member_count: number;
  project_count: number;
  task_count: number;
  children?: OrgUnit[];
  members?: any[]; // direct members for leaf nodes
}

interface Props {
  showToast?: (message: string, type: 'success' | 'error') => void;
}

const ICONS: Record<string, any> = {
  'shield': Shield, 'building': Building, 'building-2': Building2,
  'factory': Factory, 'briefcase': Briefcase, 'award': Award,
  'package': Package, 'users': Users, 'user': User
};

const TYPE_COLORS: Record<string, string> = {
  company: '#dc2626', division: '#7c3aed', department: '#2563eb',
  team: '#059669', product: '#d97706', unit: '#0891b2'
};

const TYPE_ICONS: Record<string, string> = {
  company: 'shield', division: 'building-2', department: 'briefcase',
  team: 'users', product: 'package', unit: 'award'
};

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  if (url && !err) {
    return <img src={url} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid white' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.33, flexShrink: 0, border: '2px solid white' }}>
      {initials}
    </div>
  );
}

// ── Defined OUTSIDE main component so it never remounts on parent re-render ──
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(226,232,240,0.8)',
  borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans,sans-serif',
  color: '#1F2937', background: 'white', fontWeight: 500, boxSizing: 'border-box'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 700,
  color: '#374151', marginBottom: 6, fontFamily: 'DM Sans,sans-serif'
};

function OrgModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#111827', fontFamily: 'DM Sans,sans-serif' }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(226,232,240,0.7)', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function OrganizationalChart({ showToast }: Props) {
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [draggedNode, setDraggedNode] = useState<OrgUnit | null>(null);
  const [draggedMember, setDraggedMember] = useState<any | null>(null);
  const [dragOverNode, setDragOverNode] = useState<number | null>(null);
  const [flatUnits, setFlatUnits] = useState<OrgUnit[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('tree'); // Changed default to tree
  const [zoomLevel, setZoomLevel] = useState(1); // New state for zoom
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 }); // New state for panning
  const [isPanning, setIsPanning] = useState(false); // New state for pan mode
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 }); // Last pan point
  const [isFullscreen, setIsFullscreen] = useState(false); // New state for fullscreen
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set()); // Track which units show all members

  // URL parameter handling for direct user assignment
  const [targetUser, setTargetUser] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    unit_code: '', unit_name: '', unit_type: 'division',
    office_type: 'none', parent_id: null as number | null,
    description: '', color: '#7c3aed', icon: 'building-2', is_active: 1
  });

  // Team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamUnit, setTeamUnit] = useState<OrgUnit | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');

  useEffect(() => { 
    loadTree(); 
    loadEmployees(); 
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    if (userParam) {
      setTargetUser(userParam);
      setAddSearch(userParam); // Pre-fill search with target user
    }
  }, []);

  // Keyboard shortcuts for grid navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'grid') return;
      
      const panSpeed = 50;
      const zoomSpeed = 0.1;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPanPosition(prev => ({ ...prev, y: prev.y + panSpeed }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPanPosition(prev => ({ ...prev, y: prev.y - panSpeed }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPanPosition(prev => ({ ...prev, x: prev.x + panSpeed }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPanPosition(prev => ({ ...prev, x: prev.x - panSpeed }));
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleResetView();
          }
          break;
      }
    };

    if (viewMode === 'grid') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [viewMode, zoomLevel]);

  const flatten = (units: OrgUnit[]): OrgUnit[] => {
    let r: OrgUnit[] = [];
    units.forEach(u => { r.push(u); if (u.children) r = r.concat(flatten(u.children)); });
    return r;
  };

  const calcAggregated = (units: OrgUnit[]): OrgUnit[] =>
    units.map(u => {
      const children = u.children ? calcAggregated(u.children) : [];
      const childTotal = children.reduce((s, c) => s + (c.aggregated_staff_count || 0), 0);
      return { ...u, children, aggregated_staff_count: (u.staff_count || 0) + childTotal };
    });

  const loadTree = async () => {
    setLoading(true);
    try {
      // Load tree structure and all members in parallel
      const [treeRes, membersRes] = await Promise.all([
        fetch('/api/organization/tree'),
        fetch('/api/organization/tree?action=all_members')
      ]);
      
      const treeData = await treeRes.json();
      const membersData = await membersRes.json();

      if (treeData.success) {
        const withCounts = calcAggregated(treeData.tree);

        // Build comprehensive member map from API response
        const memberMap = new Map<number, any[]>();
        if (membersData.success && Array.isArray(membersData.members)) {
          console.log('📊 Total members loaded:', membersData.members.length);
          
          // Group members by unit_id
          membersData.members.forEach((member: any) => {
            const unitId = member.unit_id;
            if (!memberMap.has(unitId)) {
              memberMap.set(unitId, []);
            }
            memberMap.get(unitId)!.push(member);
          });
          
          console.log('📋 Units with members:', memberMap.size);
          console.log('🔍 Member distribution:', Array.from(memberMap.entries()).map(([unitId, members]) => 
            `Unit ${unitId}: ${members.length} members`
          ));
        } else {
          console.warn('⚠️ No members data received or invalid format');
        }

        // Attach members to ALL organizational units
        const attachMembers = (nodes: OrgUnit[]): OrgUnit[] =>
          nodes.map(node => {
            const children = node.children ? attachMembers(node.children) : [];
            const nodeMembers = memberMap.get(node.id) || [];
            
            // Update staff counts based on actual members
            const directCount = nodeMembers.length;
            const childCount = children.reduce((sum, child) => sum + (child.aggregated_staff_count || 0), 0);
            
            return { 
              ...node, 
              children, 
              members: nodeMembers,
              staff_count: directCount,
              aggregated_staff_count: directCount + childCount
            };
          });

        const withMembers = attachMembers(withCounts);
        setTree(withMembers);
        setFlatUnits(flatten(withMembers));
        
        // Auto-expand first 2 levels for better visibility
        const toExpand = new Set<number>();
        const addExpand = (units: OrgUnit[], maxLevel: number) =>
          units.forEach(unit => { 
            if (unit.level <= maxLevel) { 
              toExpand.add(unit.id); 
              if (unit.children) addExpand(unit.children, maxLevel); 
            } 
          });
        addExpand(withMembers, 2);
        setExpandedNodes(toExpand);
        
        // Auto-expand all member lists by default
        const allUnitIds = flatten(withMembers).map(u => u.id);
        setExpandedMembers(new Set(allUnitIds));
        
        console.log('✅ Tree loaded successfully with', withMembers.length, 'root units');
      } else {
        console.error('❌ Failed to load tree:', treeData.error);
        showToast?.('Failed to load organizational tree', 'error');
      }
    } catch (error) { 
      console.error('💥 Error loading tree:', error);
      showToast?.('Failed to load organizational structure', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setEmployees(data.users.filter((u: any) => u.is_active));
    } catch {}
  };

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, unit: OrgUnit) => { setDraggedNode(unit); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, unit: OrgUnit) => { e.preventDefault(); setDragOverNode(unit.id); };
  const handleDragLeave = () => setDragOverNode(null);
  const handleDrop = async (e: React.DragEvent, target: OrgUnit) => {
    e.preventDefault(); setDragOverNode(null);
    if (!draggedNode || draggedNode.id === target.id) return;
    if (target.path?.startsWith(draggedNode.path + '/')) { showToast?.('Cannot move parent into child', 'error'); return; }
    try {
      const res = await fetch('/api/organization/tree', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', id: draggedNode.id, new_parent_id: target.id, new_sort_order: 0 })
      });
      const data = await res.json();
      if (data.success) { showToast?.('Moved!', 'success'); loadTree(); setExpandedNodes(p => new Set(Array.from(p).concat([target.id]))); }
      else showToast?.(data.error || 'Failed', 'error');
    } catch { showToast?.('Error', 'error'); }
    setDraggedNode(null);
  };

  // AI autofill
  const handleCodeChange = (code: string) => {
    const upper = code.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/__+/g, '_');
    const autoName = upper.split('_').filter(Boolean).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    setFormData(p => ({ ...p, unit_code: upper, unit_name: p.unit_name || autoName }));
  };

  const handleTypeChange = (type: string) => {
    setFormData(p => ({
      ...p, unit_type: type,
      icon: TYPE_ICONS[type] || 'building-2',
      color: TYPE_COLORS[type] || '#7c3aed'
    }));
  };

  const openCreate = (parent?: OrgUnit) => {
    setModalMode('create');
    setSelectedUnit(parent || null);
    setFormData({ unit_code: '', unit_name: '', unit_type: 'division', office_type: 'none', parent_id: parent?.id || null, description: '', color: '#7c3aed', icon: 'building-2', is_active: 1 });
    setShowModal(true);
  };

  const openEdit = (unit: OrgUnit) => {
    setModalMode('edit');
    setSelectedUnit(unit);
    setFormData({ unit_code: unit.unit_code, unit_name: unit.unit_name, unit_type: unit.unit_type, office_type: unit.office_type || 'none', parent_id: unit.parent_id, description: '', color: unit.color, icon: unit.icon, is_active: unit.is_active });
    setShowModal(true);
  };

  const saveUnit = async () => {
    if (!formData.unit_code || !formData.unit_name) { showToast?.('Code and name required', 'error'); return; }
    setSaving(true);
    try {
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const payload: any = {
        unit_code: formData.unit_code, unit_name: formData.unit_name,
        unit_type: formData.unit_type, office_type: formData.office_type,
        color: formData.color, icon: formData.icon,
        description: formData.description || null, is_active: formData.is_active
      };
      if (modalMode === 'edit') payload.id = selectedUnit?.id;
      else payload.parent_id = formData.parent_id || null;

      const res = await fetch('/api/organization/tree', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        showToast?.(modalMode === 'edit' ? '✅ Updated!' : '✅ Created!', 'success');
        setShowModal(false); loadTree();
        if (formData.parent_id) setExpandedNodes(p => new Set(Array.from(p).concat([formData.parent_id!])));
      } else showToast?.(data.error || 'Failed', 'error');
    } catch (e: any) { showToast?.('Error: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const deleteUnit = async (unit: OrgUnit) => {
    if (unit.level === 0) { showToast?.('Cannot delete root', 'error'); return; }
    if (!confirm(`Delete "${unit.unit_name}"?`)) return;
    try {
      const res = await fetch(`/api/organization/tree?id=${unit.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast?.('Deleted', 'success'); loadTree(); }
      else showToast?.(data.error || 'Failed', 'error');
    } catch { showToast?.('Error', 'error'); }
  };

  // Team members
  const getAllChildIds = (unit: OrgUnit): number[] => {
    const ids = [unit.id];
    if (unit.children) unit.children.forEach(c => ids.push(...getAllChildIds(c)));
    return ids;
  };

  const findUnit = (root: OrgUnit, id: number): OrgUnit | null => {
    if (root.id === id) return root;
    for (const c of root.children || []) { const f = findUnit(c, id); if (f) return f; }
    return null;
  };

  const openTeamModal = async (unit: OrgUnit) => {
    setTeamUnit(unit); 
    setShowTeamModal(true); 
    setLoadingTeam(true); 
    setTeamSearch(''); 
    setAddSearch('');
    
    try {
      console.log(`🔍 Loading team members for unit: ${unit.unit_name} (ID: ${unit.id})`);
      
      // Get direct members for this specific unit only
      const res = await fetch(`/api/admin/team-members?org_unit_id=${unit.id}`);
      const data = await res.json();
      
      if (data.success) {
        console.log(`✅ Loaded ${data.members?.length || 0} direct members for ${unit.unit_name}`);
        setTeamMembers(data.members || []);
      } else {
        console.error('❌ Failed to load team members:', data.error);
        showToast?.(`Failed to load team members: ${data.error}`, 'error');
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('💥 Error loading team members:', error);
      showToast?.('Failed to load team members', 'error');
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const addTeamMember = async (username: string) => {
    if (!teamUnit) return;
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_unit_id: teamUnit.id, username, role: 'member' })
      });
      const data = await res.json();
      if (data.success) { showToast?.('✅ Added!', 'success'); openTeamModal(teamUnit); }
      else showToast?.(data.error || 'Failed', 'error');
    } catch { showToast?.('Error', 'error'); }
  };

  const removeTeamMember = async (username: string, unitId?: number) => {
    if (!confirm('Remove member from this unit?')) return;
    
    const targetUnitId = unitId || teamUnit?.id;
    if (!targetUnitId) return;
    
    try {
      const res = await fetch(`/api/admin/team-members?org_unit_id=${targetUnitId}&username=${username}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();
      
      if (data.success) { 
        showToast?.('Member removed', 'success'); 
        if (teamUnit) openTeamModal(teamUnit); // Refresh the modal
      } else {
        showToast?.(data.error || 'Failed to remove member', 'error');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      showToast?.('Error removing member', 'error');
    }
  };

  // Drag & drop for members
  const handleMemberDragStart = (e: React.DragEvent, member: any) => {
    setDraggedMember(member);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMemberDragOver = (e: React.DragEvent, unit: OrgUnit) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMember) {
      setDragOverNode(unit.id);
    }
  };

  const handleMemberDrop = async (e: React.DragEvent, targetUnit: OrgUnit) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);
    
    if (!draggedMember) return;
    
    try {
      // Add member to target unit
      const res = await fetch('/api/admin/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_unit_id: targetUnit.id, 
          username: draggedMember.username, 
          role: 'staff' 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        showToast?.(`✅ ${draggedMember.full_name} added to ${targetUnit.unit_name}!`, 'success');
        loadTree(); // Refresh to show updated counts
      } else {
        showToast?.(data.error || 'Failed to add member', 'error');
      }
    } catch (err: any) {
      showToast?.('Error: ' + err.message, 'error');
    }
    
    setDraggedMember(null);
  };

  const syncFromJobPositions = async () => {
    if (!confirm('Sync from job positions?')) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/organization/tree/sync-job-positions', { method: 'POST' });
      const data = await res.json();
      if (data.success) { showToast?.(`✅ Synced ${data.created} units!`, 'success'); loadTree(); }
      else showToast?.(data.error || 'Failed', 'error');
    } catch { showToast?.('Error', 'error'); }
    finally { setSyncing(false); }
  };

  const getTypeLabel = (t: string) => ({ company: 'Company', division: 'Division', department: 'Dept', team: 'Team', product: 'Product', unit: 'Unit' }[t] || t);
  const getOfficeLabel = (t: string) => ({ office: '🏢', manufacturing: '🏭', both: '🏢🏭' }[t] || '');

  // ─── ZOOM AND PAN CONTROLS ────────────────────────────────────────────────
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  const handleResetView = () => { setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); };
  const handleFitToScreen = () => { 
    setZoomLevel(0.8); 
    setPanPosition({ x: 0, y: 0 }); 
  };

  // Fullscreen functionality - custom fullscreen for grid area only
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle member list visibility
  const toggleMemberList = (unitId: number) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  // Listen for ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && viewMode === 'grid') { // Left click only in grid mode
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && viewMode === 'grid') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPanPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode === 'grid') {
      if (e.ctrlKey || e.metaKey) {
        // Zoom with Ctrl + Scroll
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoomLevel(prev => Math.max(0.3, Math.min(3, prev + delta)));
      } else {
        // Pan with regular scroll - but allow normal scroll on touchpad
        const panSpeed = 20;
        setPanPosition(prev => ({
          x: prev.x - (e.deltaX * panSpeed / 100),
          y: prev.y - (e.deltaY * panSpeed / 100)
        }));
      }
    }
  };

  // ─── RENDER ORGANIZATIONAL CHART (GRID VIEW) ──────────────────────────────
  const renderOrgChart = (unit: OrgUnit, depth = 0): JSX.Element => {
    const Icon = ICONS[unit.icon] || Building2;
    const hasChildren = (unit.children?.length || 0) > 0;
    const isExpanded = expandedNodes.has(unit.id);
    const total = unit.aggregated_staff_count || 0;
    const direct = unit.staff_count || 0;
    const showAllMembers = expandedMembers.has(unit.id);
    
    // Get all members for this unit
    const allMembers = unit.members || [];
    
    // Check for explicitly assigned leader/manager for this unit
    let leader = null;
    let regularMembers = [...allMembers];
    
    // Only show leader if explicitly assigned via org_unit_staff with leadership role
    const leaderMember = allMembers.find(m => 
      m.team_role && ['owner', 'manager', 'leader', 'direktur'].includes(m.team_role.toLowerCase())
    );
    
    if (leaderMember) {
      leader = leaderMember;
      regularMembers = allMembers.filter(m => m.username !== leaderMember.username);
    } else {
      // No explicit leader - all members are equal
      leader = null;
      regularMembers = allMembers;
    }
    
    const displayMembers = showAllMembers ? regularMembers : regularMembers.slice(0, 3);

    // Calculate card size based on depth
    const cardWidth = Math.max(200, 240 - (depth * 15));
    const cardHeight = Math.max(140, 160 - (depth * 10));
    const gap = Math.max(30, 50 - (depth * 5));

    return (
      <div key={unit.id} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        margin: `${10 + depth * 5}px`,
        position: 'relative'
      }}>
        {/* Role Card */}
        <div
          draggable onDragStart={e => handleDragStart(e, unit)}
          onDragOver={e => draggedMember ? handleMemberDragOver(e, unit) : handleDragOver(e, unit)} 
          onDragLeave={handleDragLeave}
          onDrop={e => draggedMember ? handleMemberDrop(e, unit) : handleDrop(e, unit)}
          style={{
            background: 'white',
            border: `2px solid ${unit.color}`,
            borderRadius: 12,
            padding: '12px',
            width: cardWidth,
            minHeight: cardHeight,
            boxShadow: `0 ${4 + depth}px ${12 + depth * 2}px rgba(0,0,0,${0.1 + depth * 0.02})`,
            cursor: 'grab',
            transition: 'all 200ms',
            position: 'relative',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Role Header */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 8, 
              background: `linear-gradient(135deg,${unit.color},${unit.color}cc)`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 6px',
              boxShadow: `0 2px 6px ${unit.color}40`
            }}>
              <Icon size={16} color="white" />
            </div>
            
            {/* Role Title - Primary Focus */}
            <h3 style={{ 
              margin: 0, 
              fontSize: `${0.85 - depth * 0.05}rem`, 
              fontWeight: 800, 
              color: '#111827', 
              fontFamily: 'DM Sans,sans-serif',
              lineHeight: 1.2,
              wordBreak: 'break-word'
            }}>
              {unit.unit_name}
            </h3>
            
            <div style={{ 
              fontSize: `${0.65 - depth * 0.03}rem`, 
              color: unit.color, 
              fontWeight: 600, 
              textTransform: 'uppercase',
              marginTop: 2
            }}>
              {getTypeLabel(unit.unit_type)}
            </div>
          </div>

          {/* Leader Info - Only show if explicitly assigned */}
          {leader && (
            <div style={{ marginBottom: 8, paddingTop: 6, borderTop: `1px solid ${unit.color}20` }}>
              <div style={{ 
                fontSize: `${0.6 - depth * 0.02}rem`, 
                color: unit.color, 
                fontWeight: 600, 
                marginBottom: 4,
                textTransform: 'uppercase'
              }}>
                {leader.team_role?.toLowerCase() === 'owner' ? 'Owner' : 
                 leader.team_role?.toLowerCase() === 'manager' ? 'Manager' : 
                 leader.team_role?.toLowerCase() === 'direktur' ? 'Direktur' : 'Leader'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Avatar src={leader.avatar} name={leader.full_name} size={24} />
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: `${0.75 - depth * 0.03}rem`, 
                    fontWeight: 600, 
                    color: '#374151', 
                    fontFamily: 'DM Sans,sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {leader.full_name}
                  </div>
                  <div style={{ 
                    fontSize: `${0.6 - depth * 0.02}rem`, 
                    color: '#9CA3AF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {leader.job_position || leader.team_role}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Members List - Show Regular Members Only */}
          {regularMembers.length > 0 && (
            <div style={{ 
              marginBottom: 8, 
              paddingTop: 6, 
              borderTop: `1px solid ${unit.color}20`,
              maxHeight: showAllMembers ? '200px' : '80px',
              overflow: 'auto',
              transition: 'max-height 0.3s ease'
            }}>
              {/* Members Header with Toggle */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 6
              }}>
                <div style={{ 
                  fontSize: `${0.65 - depth * 0.02}rem`,
                  fontWeight: 600,
                  color: unit.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}>
                  <Users size={8} />
                  {regularMembers.length} {regularMembers.length === 1 ? 'member' : 'members'}
                </div>
                {regularMembers.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMemberList(unit.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: unit.color,
                      cursor: 'pointer',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      padding: '2px 4px',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}
                    title={showAllMembers ? 'Show less' : 'Show all'}
                  >
                    {showAllMembers ? (
                      <>
                        <ChevronDown size={8} />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronRight size={8} />
                        All
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Members Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                gap: 4,
                maxWidth: '100%'
              }}>
                {displayMembers.map((member: any, index: number) => {
                  // Determine if this is a support member
                  const isSupport = member.team_role === 'support';
                  const memberBg = isSupport ? 'rgba(59,130,246,0.08)' : `${unit.color}08`;
                  const memberBorder = isSupport ? '1px solid rgba(59,130,246,0.3)' : `1px solid ${unit.color}20`;
                  
                  return (
                    <div
                      key={member.username}
                      draggable
                      onDragStart={e => handleMemberDragStart(e, member)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '4px',
                        borderRadius: 6,
                        background: memberBg,
                        border: memberBorder,
                        cursor: 'grab',
                        transition: 'all 150ms',
                        position: 'relative'
                      }}
                      title={`${member.full_name}\n${member.team_role ? member.team_role.toUpperCase() : 'Staff'}\n${member.job_position || ''}`}
                    >
                      {isSupport && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          border: '1px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.45rem'
                        }}>
                          🔧
                        </div>
                      )}
                      <Avatar src={member.avatar} name={member.full_name} size={20} />
                      <div style={{
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        color: isSupport ? '#3b82f6' : '#374151',
                        textAlign: 'center',
                        marginTop: 2,
                        lineHeight: 1.1,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.full_name.split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show "and X more" indicator when collapsed */}
                {!showAllMembers && regularMembers.length > 3 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: 6,
                    background: `${unit.color}15`,
                    border: `1px dashed ${unit.color}40`,
                    fontSize: '0.55rem',
                    fontWeight: 600,
                    color: unit.color,
                    textAlign: 'center'
                  }}>
                    +{regularMembers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            {[
              { icon: <Users size={8} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', title: 'Team', onClick: () => openTeamModal(unit) },
              { icon: <Plus size={8} />, color: unit.color, bg: `${unit.color}15`, title: 'Add', onClick: () => openCreate(unit) },
              { icon: <Edit2 size={7} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', title: 'Edit', onClick: () => openEdit(unit) }
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} title={btn.title} style={{ 
                width: 20, 
                height: 20, 
                borderRadius: 4, 
                border: `1px solid ${btn.color}30`, 
                background: btn.bg, 
                color: btn.color, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                padding: 0 
              }}>
                {btn.icon}
              </button>
            ))}
          </div>

          {/* Expand/Collapse button for children */}
          {hasChildren && (
            <button 
              onClick={() => toggleNode(unit.id)}
              style={{
                position: 'absolute',
                bottom: -10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${unit.color}`,
                background: 'white',
                color: unit.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>

        {/* Connection Lines and Children */}
        {hasChildren && isExpanded && (
          <div style={{ 
            position: 'relative', 
            marginTop: 15,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Vertical line down from parent */}
            <div style={{
              position: 'absolute',
              top: -15,
              left: '50%',
              width: 2,
              height: 15,
              background: `${unit.color}60`,
              transform: 'translateX(-50%)'
            }} />
            
            {/* Children container with proper spacing */}
            <div style={{ 
              display: 'flex',
              gap: gap,
              justifyContent: 'center',
              alignItems: 'flex-start',
              flexWrap: 'nowrap', // Prevent wrapping to maintain structure
              paddingTop: 15,
              position: 'relative',
              width: 'max-content', // Ensure container fits content
              minWidth: '100%'
            }}>
              {/* Horizontal line across all children - positioned correctly */}
              {unit.children!.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `${unit.color}60`,
                  transform: 'translateY(-1px)',
                  width: '100%'
                }} />
              )}
              
              {unit.children!.map((child, index) => (
                <div key={child.id} style={{ 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {/* Vertical line up to each child */}
                  <div style={{
                    position: 'absolute',
                    top: -15,
                    left: '50%',
                    width: 2,
                    height: 15,
                    background: `${unit.color}60`,
                    transform: 'translateX(-50%)'
                  }} />
                  {renderOrgChart(child, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER NODE (TREE VIEW) ──────────────────────────────────────────────
  const renderNode = (unit: OrgUnit, depth = 0): JSX.Element => {
    const Icon = ICONS[unit.icon] || Building2;
    const hasChildren = (unit.children?.length || 0) > 0;
    const isExpanded = expandedNodes.has(unit.id);
    const isDragOver = dragOverNode === unit.id;
    const isRoot = unit.level === 0;
    const total = unit.aggregated_staff_count || 0;
    const direct = unit.staff_count || 0;

    return (
      <div key={unit.id} className={styles.orgUnit}>
        <div
          draggable onDragStart={e => handleDragStart(e, unit)}
          onDragOver={e => draggedMember ? handleMemberDragOver(e, unit) : handleDragOver(e, unit)} 
          onDragLeave={handleDragLeave}
          onDrop={e => draggedMember ? handleMemberDrop(e, unit) : handleDrop(e, unit)}
          className={`${styles.unitCard} ${isRoot ? styles.root : ''} ${isDragOver ? (draggedMember ? styles.dragOverMember : styles.dragOver) : ''}`}
          style={{
            background: isDragOver ? (draggedMember ? 'rgba(16,185,129,0.08)' : `${unit.color}12`) : 'white',
            borderTopColor: isDragOver ? (draggedMember ? '#10b981' : unit.color) : 'rgba(226,232,240,0.6)',
            borderRightColor: isDragOver ? (draggedMember ? '#10b981' : unit.color) : 'rgba(226,232,240,0.6)',
            borderBottomColor: isDragOver ? (draggedMember ? '#10b981' : unit.color) : 'rgba(226,232,240,0.6)',
            borderLeftColor: isDragOver && draggedMember ? '#10b981' : unit.color,
            opacity: unit.is_active ? 1 : 0.5,
          }}
        >
          <div className={styles.unitContent}>
            <GripVertical size={12} style={{ color: '#CBD5E1', flexShrink: 0 }} />

            {hasChildren && (
              <button onClick={() => toggleNode(unit.id)} style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${unit.color}30`, background: `${unit.color}10`, color: unit.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            )}
            {!hasChildren && <div style={{ width: 18 }} />}

            <div style={{ width: isRoot ? 32 : 28, height: isRoot ? 32 : 28, borderRadius: isRoot ? 8 : 6, background: `linear-gradient(135deg,${unit.color},${unit.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${unit.color}30` }}>
              <Icon size={isRoot ? 16 : 14} color="white" />
            </div>

            <div className={styles.unitInfo}>
              <div className={styles.unitHeader}>
                <span className={`${styles.unitName} ${isRoot ? styles.root : styles.child}`}>{unit.unit_name}</span>
                <span style={{ padding: '2px 6px', background: `${unit.color}18`, color: unit.color, borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>{getTypeLabel(unit.unit_type)}</span>
                {unit.office_type && unit.office_type !== 'none' && <span style={{ fontSize: '0.7rem' }}>{getOfficeLabel(unit.office_type)}</span>}
                {total > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: 'rgba(124,58,237,0.1)', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, color: '#7c3aed' }}>
                    <Users size={9} /> {total}{total > direct && direct > 0 ? ` (${direct})` : ''}
                  </span>
                )}
              </div>
              <div className={styles.unitMeta}>
                {unit.unit_code} · Level {unit.level}{hasChildren ? ` · ${unit.children!.length} sub-units` : ''}
              </div>
            </div>

            <div className={styles.unitActions}>
              {[
                { icon: <Users size={12} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', title: 'Team Members', onClick: () => openTeamModal(unit) },
                { icon: <Plus size={12} />, color: unit.color, bg: `${unit.color}15`, title: 'Add Sub-unit', onClick: () => openCreate(unit) },
                { icon: <Edit2 size={11} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', title: 'Edit Unit', onClick: () => openEdit(unit) },
                ...(unit.level > 0 ? [{ icon: <Trash2 size={11} />, color: '#dc2626', bg: 'rgba(239,68,68,0.1)', title: 'Delete Unit', onClick: () => deleteUnit(unit) }] : [])
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title} className={styles.actionButton} style={{ borderColor: `${btn.color}30`, background: btn.bg, color: btn.color }}>
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── LEAF NODE MEMBERS INLINE ── */}
          {!hasChildren && unit.members && unit.members.length > 0 && (
            <div className={styles.membersInline} style={{ borderTopColor: `${unit.color}15` }}>
              <div className={styles.membersList}>
                {unit.members.slice(0, 8).map((m: any) => (
                  <div
                    key={m.username}
                    draggable
                    onDragStart={e => handleMemberDragStart(e, m)}
                    title={`${m.full_name}\n${m.job_position || ''}`}
                    className={styles.memberChip}
                    style={{ borderColor: `${unit.color}25` }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 2px 8px ${unit.color}30`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
                  >
                    <Avatar src={m.avatar} name={m.full_name} size={22} />
                    <span className={styles.memberName}>
                      {m.full_name?.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                ))}
                {unit.members.length > 8 && (
                  <div className={styles.moreMembers}>
                    +{unit.members.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className={styles.childrenContainer} style={{ borderLeftColor: `${unit.color}20` }}>
            <div className={viewMode === 'grid' ? styles.childrenGrid : styles.childrenTree} style={{ 
              gridTemplateColumns: viewMode === 'grid' ? (depth === 0 ? 'repeat(auto-fit, minmax(400px, 1fr))' : depth === 1 ? 'repeat(auto-fit, minmax(350px, 1fr))' : '1fr') : undefined
            }}>
              {unit.children!.map(c => renderNode(c, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}>
            <Building2 size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#111827', fontFamily: 'DM Sans,sans-serif' }}>Organizational Structure</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>✨ Drag members to units</span> • Drag units to reorder • CRUD operations • {flatUnits.length} total units
              {targetUser && (
                <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>
                  🎯 Managing assignments for: {targetUser}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* View Mode Toggle */}
          <div className={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : styles.inactive}`}
            >
              <Grid3x3 size={12} />
              Grid
            </button>
            <button 
              onClick={() => setViewMode('tree')} 
              className={`${styles.viewButton} ${viewMode === 'tree' ? styles.active : styles.inactive}`}
            >
              <Building2 size={12} />
              Tree
            </button>
          </div>

          {/* Zoom Controls - Only show in Grid mode */}
          {viewMode === 'grid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(226,232,240,0.3)', borderRadius: 8, padding: 4 }}>
              <button 
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.3}
                style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 4, 
                  border: 'none', 
                  background: zoomLevel <= 0.3 ? 'rgba(156,163,175,0.3)' : 'white', 
                  color: zoomLevel <= 0.3 ? '#9CA3AF' : '#374151',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: zoomLevel <= 0.3 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
                −
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', minWidth: 40, textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button 
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 4, 
                  border: 'none', 
                  background: zoomLevel >= 3 ? 'rgba(156,163,175,0.3)' : 'white', 
                  color: zoomLevel >= 3 ? '#9CA3AF' : '#374151',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
                +
              </button>
              <button 
                onClick={handleResetView}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  border: 'none', 
                  background: 'white', 
                  color: '#374151',
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  marginLeft: 4
                }}
              >
                Reset
              </button>
              <button 
                onClick={handleFitToScreen}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  border: 'none', 
                  background: 'white', 
                  color: '#374151',
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  marginLeft: 2
                }}
              >
                Fit
              </button>
            </div>
          )}

          {/* Fullscreen Toggle - Show in Grid mode */}
          {viewMode === 'grid' && (
            <button 
              onClick={toggleFullscreen}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                padding: '8px 12px', 
                background: isFullscreen ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#059669,#047857)', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 700, 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 150ms'
              }}
              title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen (F11)'}
            >
              {isFullscreen ? (
                <>
                  <X size={12} />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Fullscreen
                </>
              )}
            </button>
          )}
          
          <button onClick={syncFromJobPositions} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: syncing ? '#9CA3AF' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.8125rem', cursor: syncing ? 'not-allowed' : 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.25)', transition: 'all 150ms' }}>
            {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />} Sync Jobs
          </button>
          <button onClick={() => openCreate()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', boxShadow: '0 3px 10px rgba(124,58,237,0.25)', transition: 'all 150ms' }}>
            <Plus size={14} /> New Unit
          </button>
        </div>
      </div>

      {/* Tree Container with Responsive Layout */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
          <p className={styles.loadingText}>Loading organizational structure...</p>
        </div>
      ) : (
        <>
          <div className={styles.treeContainer}>
            <div 
              className={styles.scrollArea}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ 
                cursor: viewMode === 'grid' ? (isPanning ? 'grabbing' : 'grab') : 'default',
                overflow: viewMode === 'grid' ? 'hidden' : 'auto',
                touchAction: viewMode === 'grid' ? 'none' : 'auto' // Prevent default touch behavior in grid mode
              }}
            >
              {viewMode === 'grid' ? (
                <div 
                  data-grid-container
                  style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '40px',
                    minHeight: '600px',
                    minWidth: '2000px', // Increased width for wider structures
                    width: 'max-content', // Allow container to grow as needed
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                    position: 'relative'
                  }}
                >
                  {/* Grid Instructions */}
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    fontFamily: 'DM Sans,sans-serif',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    backdropFilter: 'blur(4px)',
                    maxWidth: 280
                  }}>
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>🎯 Navigation Controls</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', fontSize: '0.7rem' }}>
                      <span>🖱️ <strong>Click & Drag</strong></span><span>Pan around</span>
                      <span>⌨️ <strong>Arrow Keys</strong></span><span>Navigate</span>
                      <span>🖱️ <strong>Ctrl + Scroll</strong></span><span>Zoom in/out</span>
                      <span>⌨️ <strong>Ctrl + 0</strong></span><span>Reset view</span>
                      <span>⌨️ <strong>Ctrl + ±</strong></span><span>Zoom controls</span>
                    </div>
                  </div>
                  
                  {/* Render org chart with proper centering */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    width: '100%',
                    minWidth: 'max-content'
                  }}>
                    {tree.map(n => renderOrgChart(n))}
                  </div>
                </div>
              ) : (
                <div className={styles.treeLayout}>
                  {tree.map(n => renderNode(n))}
                </div>
              )}
            </div>

            {/* Mini-map Navigator - Only show in Grid mode */}
            {viewMode === 'grid' && (
              <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 150,
                height: 100,
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(226,232,240,0.5)',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 20
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Navigator</div>
                <div style={{
                  width: '100%',
                  height: 60,
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Viewport indicator */}
                  <div style={{
                    position: 'absolute',
                    width: `${Math.min(100, 100 / zoomLevel)}%`,
                    height: `${Math.min(100, 100 / zoomLevel)}%`,
                    background: 'rgba(124,58,237,0.3)',
                    border: '1px solid #7c3aed',
                    borderRadius: 2,
                    left: `${Math.max(0, Math.min(100 - (100 / zoomLevel), 50 - (panPosition.x / (zoomLevel * 10))))}%`,
                    top: `${Math.max(0, Math.min(100 - (100 / zoomLevel), 50 - (panPosition.y / (zoomLevel * 10))))}%`,
                    transition: 'all 0.1s ease-out'
                  }} />
                  {/* Simplified org structure */}
                  <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 8,
                    height: 6,
                    background: '#dc2626',
                    borderRadius: 1
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '30%',
                    width: 6,
                    height: 4,
                    background: '#7c3aed',
                    borderRadius: 1
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '30%',
                    width: 6,
                    height: 4,
                    background: '#7c3aed',
                    borderRadius: 1
                  }} />
                </div>
              </div>
            )}

            {/* Zoom Level Indicator - Only show in Grid mode */}
            {viewMode === 'grid' && (
              <div style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                background: 'rgba(255,255,255,0.95)',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                fontFamily: 'DM Sans,sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid rgba(226,232,240,0.5)'
              }}>
                Zoom: {Math.round(zoomLevel * 100)}%
              </div>
            )}
          </div>

          {/* Fullscreen Overlay - Only for Grid View */}
          {isFullscreen && viewMode === 'grid' && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Fullscreen Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.95)',
                borderBottom: '1px solid rgba(226,232,240,0.5)',
                backdropFilter: 'blur(8px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 8, 
                    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(124,58,237,0.25)'
                  }}>
                    <Building2 size={16} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans,sans-serif' }}>
                      Organizational Structure - Fullscreen
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Press ESC or click Exit to return
                    </div>
                  </div>
                </div>

                {/* Fullscreen Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Zoom Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(226,232,240,0.3)', borderRadius: 8, padding: 4 }}>
                    <button 
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.3}
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 4, 
                        border: 'none', 
                        background: zoomLevel <= 0.3 ? 'rgba(156,163,175,0.3)' : 'white', 
                        color: zoomLevel <= 0.3 ? '#9CA3AF' : '#374151',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: zoomLevel <= 0.3 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 700
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', minWidth: 40, textAlign: 'center' }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 4, 
                        border: 'none', 
                        background: zoomLevel >= 3 ? 'rgba(156,163,175,0.3)' : 'white', 
                        color: zoomLevel >= 3 ? '#9CA3AF' : '#374151',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 700
                      }}
                    >
                      +
                    </button>
                    <button 
                      onClick={handleResetView}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        border: 'none', 
                        background: 'white', 
                        color: '#374151',
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        marginLeft: 4
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  {/* Exit Fullscreen */}
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      padding: '8px 12px', 
                      background: 'linear-gradient(135deg,#dc2626,#b91c1c)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 8, 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
                      transition: 'all 150ms'
                    }}
                  >
                    <X size={12} />
                    Exit Fullscreen
                  </button>
                </div>
              </div>

              {/* Fullscreen Grid Content */}
              <div style={{ 
                flex: 1,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    cursor: isPanning ? 'grabbing' : 'grab',
                    overflow: 'hidden',
                    touchAction: 'none'
                  }}
                >
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '40px',
                    minHeight: '100%',
                    minWidth: '2000px',
                    width: 'max-content',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                    position: 'relative'
                  }}>
                    {/* Render org chart */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      width: '100%',
                      minWidth: 'max-content'
                    }}>
                      {tree.map(n => renderOrgChart(n))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CREATE/EDIT MODAL ── */}
      {showModal && (
        <OrgModal title={modalMode === 'edit' ? '✏️ Edit Unit' : '➕ Create Unit'} onClose={() => !saving && setShowModal(false)}>
          {selectedUnit && modalMode === 'create' && (
            <div style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: '0.8125rem', color: '#374151', marginBottom: 16 }}>
              📍 Under: <strong>{selectedUnit.unit_name}</strong>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Code */}
            <div>
              <label style={labelStyle}>Unit Code * <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.75rem' }}>✨ auto-fills name</span></label>
              <input style={{ ...inputStyle, background: modalMode === 'edit' ? '#F9FAFB' : 'white' }}
                value={formData.unit_code} disabled={modalMode === 'edit'}
                onChange={e => handleCodeChange(e.target.value)} placeholder="e.g. CREATIVE_TEAM" />
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>Unit Name *</label>
              <input style={inputStyle} value={formData.unit_name}
                onChange={e => setFormData(p => ({ ...p, unit_name: e.target.value }))} placeholder="e.g. Creative Team" />
            </div>

            {/* Type + Office */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Type * <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.75rem' }}>✨ auto icon</span></label>
                <select style={inputStyle} value={formData.unit_type} onChange={e => handleTypeChange(e.target.value)}>
                  <option value="company">Company</option>
                  <option value="division">Division</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="product">Product</option>
                  <option value="unit">Unit</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Office Type</label>
                <select style={inputStyle} value={formData.office_type} onChange={e => setFormData(p => ({ ...p, office_type: e.target.value }))}>
                  <option value="none">None</option>
                  <option value="office">🏢 Office</option>
                  <option value="manufacturing">🏭 Manufacturing</option>
                  <option value="both">🏢🏭 Both</option>
                </select>
              </div>
            </div>

            {/* Color + Icon */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Color <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.75rem' }}>✨ auto</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
                    style={{ width: 48, height: 40, padding: 2, border: '1.5px solid rgba(226,232,240,0.8)', borderRadius: 8, cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'monospace' }}>{formData.color}</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Icon <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.75rem' }}>✨ auto</span></label>
                <select style={inputStyle} value={formData.icon} onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))}>
                  <option value="building-2">🏢 Building</option>
                  <option value="factory">🏭 Factory</option>
                  <option value="briefcase">💼 Briefcase</option>
                  <option value="users">👥 Users</option>
                  <option value="award">🏆 Award</option>
                  <option value="package">📦 Package</option>
                  <option value="shield">🛡️ Shield</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
                value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description..." />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowModal(false)} disabled={saving}
                style={{ flex: 1, padding: '11px', background: 'white', border: '1.5px solid rgba(226,232,240,0.8)', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveUnit} disabled={saving || !formData.unit_code || !formData.unit_name}
                style={{ flex: 1, padding: '11px', background: saving || !formData.unit_code || !formData.unit_name ? '#9CA3AF' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 3px 10px rgba(124,58,237,0.25)' }}>
                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : (modalMode === 'edit' ? 'Update Unit' : 'Create Unit')}
              </button>
            </div>
          </div>
        </OrgModal>
      )}

      {/* ── TEAM MEMBERS MODAL ── */}
      {showTeamModal && teamUnit && (
        <OrgModal title="👥 Team Management & Assignments" onClose={() => setShowTeamModal(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#111827', fontFamily: 'DM Sans,sans-serif', fontSize: '1.125rem' }}>
              {teamUnit.unit_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 2 }}>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Multi-role assignments</span> • 
              <span style={{ color: '#10b981', fontWeight: 600 }}> ✨ Drag members to other units</span> • 
              Set leadership roles per unit
            </div>
          </div>

          {loadingTeam ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
            </div>
          ) : (
            <>
              {/* Current team with enhanced role management */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans,sans-serif' }}>
                    Current Assignments ({teamMembers.length})
                  </div>
                </div>
                
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input 
                    value={teamSearch} 
                    onChange={e => setTeamSearch(e.target.value)} 
                    placeholder="Search current members..."
                    style={{ 
                      width: '100%', 
                      padding: '8px 10px 8px 32px', 
                      border: '1.5px solid rgba(226,232,240,0.8)', 
                      borderRadius: 8, 
                      fontSize: '0.8125rem', 
                      fontFamily: 'DM Sans,sans-serif', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>

                {teamMembers.filter(m => !teamSearch || 
                  m.full_name?.toLowerCase().includes(teamSearch.toLowerCase()) || 
                  m.username?.toLowerCase().includes(teamSearch.toLowerCase())
                ).length === 0 ? (
                  <div style={{ 
                    padding: 16, 
                    background: 'rgba(226,232,240,0.3)', 
                    border: '2px dashed rgba(226,232,240,0.7)', 
                    borderRadius: 10, 
                    textAlign: 'center', 
                    color: '#9CA3AF', 
                    fontSize: '0.8125rem' 
                  }}>
                    {teamSearch ? 'No results found' : 'No assignments in this unit yet'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflow: 'auto' }}>
                    {teamMembers
                      .filter(m => !teamSearch || 
                        m.full_name?.toLowerCase().includes(teamSearch.toLowerCase()) || 
                        m.username?.toLowerCase().includes(teamSearch.toLowerCase())
                      )
                      .map((m: any) => (
                        <div 
                          key={m.username} 
                          draggable
                          onDragStart={e => handleMemberDragStart(e, m)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 10, 
                            padding: '10px 12px', 
                            background: 'rgba(124,58,237,0.04)', 
                            border: '1px solid rgba(124,58,237,0.15)', 
                            borderRadius: 10,
                            cursor: 'grab',
                            transition: 'all 150ms'
                          }}
                        >
                          <Avatar src={m.avatar} name={m.full_name} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: 700, 
                              fontSize: '0.875rem', 
                              color: '#111827', 
                              fontFamily: 'DM Sans,sans-serif' 
                            }}>
                              {m.full_name}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 2
                            }}>
                              <span>{m.job_position || 'No position'} · @{m.username}</span>
                              {m.team_role && (
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  padding: '2px 6px', 
                                  background: m.team_role === 'leader' || m.team_role === 'manager' || m.team_role === 'owner' || m.team_role === 'direktur' ? 
                                    'rgba(245,158,11,0.1)' : 
                                    m.team_role === 'support' ? 'rgba(59,130,246,0.1)' : 
                                    'rgba(124,58,237,0.1)', 
                                  color: m.team_role === 'leader' || m.team_role === 'manager' || m.team_role === 'owner' || m.team_role === 'direktur' ? 
                                    '#f59e0b' : 
                                    m.team_role === 'support' ? '#3b82f6' : 
                                    '#7c3aed', 
                                  borderRadius: 4, 
                                  fontWeight: 600,
                                  textTransform: 'uppercase'
                                }}>
                                  {m.team_role === 'leader' ? '👑 Leader' :
                                   m.team_role === 'manager' ? '🎯 Manager' :
                                   m.team_role === 'owner' ? '🏆 Owner' :
                                   m.team_role === 'direktur' ? '💼 Direktur' :
                                   m.team_role === 'support' ? '🔧 Support' : 
                                   `👤 ${m.team_role}`}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Role Assignment Dropdown */}
                          <select
                            value={m.team_role || 'staff'}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              try {
                                const res = await fetch('/api/admin/team-members', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    org_unit_id: teamUnit.id, 
                                    username: m.username, 
                                    role: newRole 
                                  })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  showToast?.(`Role updated to ${newRole}!`, 'success');
                                  openTeamModal(teamUnit); // Refresh
                                  loadTree(); // Refresh org chart
                                } else {
                                  showToast?.(data.error || 'Failed to update role', 'error');
                                }
                              } catch (error) {
                                showToast?.('Error updating role', 'error');
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid rgba(226,232,240,0.7)',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'white',
                              color: '#374151',
                              cursor: 'pointer',
                              minWidth: 80
                            }}
                          >
                            <option value="staff">Staff</option>
                            <option value="support">Support</option>
                            <option value="leader">Leader</option>
                            <option value="manager">Manager</option>
                            <option value="owner">Owner</option>
                            <option value="direktur">Direktur</option>
                          </select>

                          <button 
                            onClick={() => removeTeamMember(m.username)}
                            style={{ 
                              padding: '4px 10px', 
                              background: 'rgba(239,68,68,0.08)', 
                              border: '1px solid rgba(239,68,68,0.25)', 
                              borderRadius: 6, 
                              color: '#dc2626', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              cursor: 'pointer' 
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Add members with search */}
              <div>
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: '0.9rem', 
                  color: '#111827', 
                  fontFamily: 'DM Sans,sans-serif', 
                  marginBottom: 10 
                }}>
                  Add Team Member
                </div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input 
                    value={addSearch} 
                    onChange={e => setAddSearch(e.target.value)} 
                    placeholder="Search employees to add..."
                    style={{ 
                      width: '100%', 
                      padding: '8px 10px 8px 32px', 
                      border: '1.5px solid rgba(226,232,240,0.8)', 
                      borderRadius: 8, 
                      fontSize: '0.8125rem', 
                      fontFamily: 'DM Sans,sans-serif', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflow: 'auto' }}>
                  {employees
                    .filter(e => !teamMembers.find((m: any) => m.username === e.username))
                    .filter(e => !addSearch || 
                      e.full_name?.toLowerCase().includes(addSearch.toLowerCase()) || 
                      e.username?.toLowerCase().includes(addSearch.toLowerCase()) || 
                      e.job_position?.toLowerCase().includes(addSearch.toLowerCase())
                    )
                    .map((emp: any) => {
                      const isTargetUser = targetUser && emp.username === targetUser;
                      return (
                        <div key={emp.username} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          padding: '8px 12px', 
                          background: isTargetUser ? 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.1))' : 'white', 
                          border: isTargetUser ? '2px solid #10b981' : '1px solid rgba(226,232,240,0.7)', 
                          borderRadius: 10,
                          position: 'relative'
                        }}>
                          {isTargetUser && (
                            <div style={{
                              position: 'absolute',
                              top: -8,
                              left: 12,
                              background: '#10b981',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              zIndex: 10
                            }}>
                              🎯 Target User
                            </div>
                          )}
                          <Avatar src={emp.avatar} name={emp.full_name} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: 700, 
                              fontSize: '0.875rem', 
                              color: isTargetUser ? '#059669' : '#111827', 
                              fontFamily: 'DM Sans,sans-serif' 
                            }}>
                              {emp.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {emp.job_position || 'No position'} · @{emp.username}
                            </div>
                          </div>
                          <select
                            defaultValue={isTargetUser ? "leader" : "staff"}
                            style={{
                              padding: '4px 8px',
                              border: isTargetUser ? '2px solid #10b981' : '1px solid rgba(226,232,240,0.7)',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: isTargetUser ? 'rgba(16,185,129,0.05)' : 'white',
                              color: '#374151',
                              cursor: 'pointer',
                              minWidth: 80,
                              marginRight: 8
                            }}
                            id={`role-${emp.username}`}
                          >
                            <option value="staff">Staff</option>
                            <option value="support">Support</option>
                            <option value="leader">Leader</option>
                            <option value="manager">Manager</option>
                            <option value="owner">Owner</option>
                            <option value="direktur">Direktur</option>
                          </select>
                          <button 
                            onClick={() => {
                              const roleSelect = document.getElementById(`role-${emp.username}`) as HTMLSelectElement;
                              const selectedRole = roleSelect?.value || 'staff';
                              
                              // Add with selected role
                              fetch('/api/admin/team-members', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  org_unit_id: teamUnit.id, 
                                  username: emp.username, 
                                  role: selectedRole 
                                })
                              }).then(res => res.json()).then(data => {
                                if (data.success) {
                                  showToast?.(`✅ ${emp.full_name} added as ${selectedRole}!`, 'success');
                                  openTeamModal(teamUnit);
                                  loadTree(); // Refresh org chart
                                  
                                  // Clear target user after successful assignment
                                  if (isTargetUser) {
                                    setTargetUser(null);
                                    setAddSearch('');
                                  }
                                } else {
                                  showToast?.(data.error || 'Failed to add member', 'error');
                                }
                              }).catch(() => {
                                showToast?.('Error adding member', 'error');
                              });
                            }}
                            style={{ 
                              padding: '5px 12px', 
                              background: isTargetUser ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', 
                              border: 'none', 
                              borderRadius: 7, 
                              color: 'white', 
                              fontSize: '0.8rem', 
                              fontWeight: 700, 
                              cursor: 'pointer', 
                              boxShadow: isTargetUser ? '0 2px 6px rgba(16,185,129,0.25)' : '0 2px 6px rgba(124,58,237,0.25)' 
                            }}
                          >
                            {isTargetUser ? '🎯 Assign' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </OrgModal>
      )}
    </div>
  );
}
