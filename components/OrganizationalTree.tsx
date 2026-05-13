'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Award, Package, Users, Folder, Grid3x3, ChevronRight, ChevronDown,
  Plus, Edit2, Trash2, GripVertical, X, Loader2, Building, Code, FileText,
  PenTool, Server, Briefcase, Shield, UserCog, Eye, EyeOff
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

interface OrgUnit {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_type: 'company' | 'brand' | 'product' | 'division' | 'department' | 'team' | 'unit';
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
  member_count: number;
  project_count: number;
  task_count: number;
  children?: OrgUnit[];
}

const ICONS: Record<string, any> = {
  'building-2': Building2,
  'building': Building,
  'award': Award,
  'package': Package,
  'palette': Grid3x3,
  'code': Code,
  'code-2': Code,
  'users': Users,
  'file-text': FileText,
  'pen-tool': PenTool,
  'server': Server,
  'briefcase': Briefcase,
  'folder': Folder
};

const TYPE_LABELS: Record<string, string> = {
  company: 'Company',
  brand: 'Brand',
  product: 'Product',
  division: 'Division',
  department: 'Department',
  team: 'Team',
  unit: 'Unit'
};

interface OrganizationalTreeProps {
  showToast?: (message: string, type: 'success' | 'error') => void;
}

export default function OrganizationalTree({ showToast }: OrganizationalTreeProps) {
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [flatList, setFlatList] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([1])); // Expand root by default
  const [selectedNode, setSelectedNode] = useState<OrgUnit | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [draggedNode, setDraggedNode] = useState<OrgUnit | null>(null);
  const [dragOverNode, setDragOverNode] = useState<number | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    unit_code: '',
    unit_name: '',
    unit_type: 'division' as OrgUnit['unit_type'],
    parent_id: null as number | null,
    owner_username: '',
    direksi_username: '',
    manager_username: '',
    description: '',
    color: '#7c3aed',
    icon: 'building'
  });

  useEffect(() => {
    loadTree();
    loadEmployees();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/tree');
      const data = await res.json();
      if (data.success) {
        setTree(data.tree);
        setFlatList(data.flatList);
      }
    } catch (error) {
      showToast?.('Failed to load organizational tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.users.filter((u: any) => u.is_active));
      }
    } catch (error) {
      console.error('Failed to load employees');
    }
  };

  const syncFromJobPositions = async () => {
    if (!confirm('Sync organizational units from employee job positions? This will create units for all unique job positions.')) return;
    
    setSyncing(true);
    try {
      const res = await fetch('/api/organization/tree/sync-job-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`✅ Synced ${data.created} units from job positions!`, 'success');
        loadTree();
      } else {
        showToast?.(data.error || 'Failed to sync', 'error');
      }
    } catch (error) {
      showToast?.('Error syncing job positions', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleNode = (id: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const openCreateModal = (parent?: OrgUnit) => {
    setModalMode('create');
    setFormData({
      unit_code: '',
      unit_name: '',
      unit_type: 'division',
      parent_id: parent?.id || null,
      owner_username: '',
      direksi_username: '',
      manager_username: '',
      description: '',
      color: '#7c3aed',
      icon: 'building'
    });
    setShowModal(true);
  };

  const openEditModal = (unit: OrgUnit) => {
    setModalMode('edit');
    setSelectedNode(unit);
    setFormData({
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      unit_type: unit.unit_type,
      parent_id: unit.parent_id,
      owner_username: unit.owner_username || '',
      direksi_username: unit.direksi_username || '',
      manager_username: unit.manager_username || '',
      description: unit.description || '',
      color: unit.color,
      icon: unit.icon
    });
    setShowModal(true);
  };

  const saveUnit = async () => {
    if (!formData.unit_code || !formData.unit_name) {
      showToast?.('Unit code and name are required', 'error');
      return;
    }

    try {
      const url = '/api/organization/tree';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const body = modalMode === 'edit' 
        ? { ...formData, id: selectedNode?.id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(modalMode === 'edit' ? 'Unit updated!' : 'Unit created!', 'success');
        setShowModal(false);
        loadTree();
      } else {
        showToast?.(data.error || 'Failed to save unit', 'error');
      }
    } catch (error) {
      showToast?.('Error saving unit', 'error');
    }
  };

  const deleteUnit = async (unit: OrgUnit) => {
    if (!confirm(`Delete "${unit.unit_name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/organization/tree?id=${unit.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast?.('Unit deleted successfully', 'success');
        loadTree();
      } else {
        showToast?.(data.error || 'Failed to delete unit', 'error');
      }
    } catch (error) {
      showToast?.('Error deleting unit', 'error');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, unit: OrgUnit) => {
    setDraggedNode(unit);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, unit: OrgUnit) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverNode(unit.id);
  };

  const handleDragLeave = () => {
    setDragOverNode(null);
  };

  const handleDrop = async (e: React.DragEvent, targetUnit: OrgUnit) => {
    e.preventDefault();
    setDragOverNode(null);

    if (!draggedNode || draggedNode.id === targetUnit.id) return;

    // Prevent dropping parent into its own child
    if (targetUnit.path.startsWith(draggedNode.path + '/')) {
      showToast?.('Cannot move parent into its own child', 'error');
      return;
    }

    try {
      const res = await fetch('/api/organization/tree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          id: draggedNode.id,
          new_parent_id: targetUnit.id,
          new_sort_order: 0
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast?.('Unit moved successfully', 'success');
        loadTree();
        // Expand target node to show the moved item
        setExpandedNodes(prev => new Set(Array.from(prev).concat(targetUnit.id)));
      } else {
        showToast?.(data.error || 'Failed to move unit', 'error');
      }
    } catch (error) {
      showToast?.('Error moving unit', 'error');
    }

    setDraggedNode(null);
  };

  const renderTreeNode = (unit: OrgUnit, depth: number = 0) => {
    const Icon = ICONS[unit.icon] || Building2;
    const hasChildren = unit.children && unit.children.length > 0;
    const isExpanded = expandedNodes.has(unit.id);
    const isDragOver = dragOverNode === unit.id;

    return (
      <div key={unit.id} style={{ marginLeft: depth * 24 }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, unit)}
          onDragOver={(e) => handleDragOver(e, unit)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, unit)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: isDragOver ? 'rgba(124,58,237,0.1)' : 'white',
            border: `1px solid ${isDragOver ? 'rgba(124,58,237,0.3)' : 'rgba(226,232,240,0.5)'}`,
            borderRadius: 10,
            marginBottom: 6,
            cursor: 'grab',
            transition: 'all 140ms',
            opacity: unit.is_active ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (!isDragOver) e.currentTarget.style.background = 'rgba(249,250,251,0.8)';
          }}
          onMouseLeave={(e) => {
            if (!isDragOver) e.currentTarget.style.background = 'white';
          }}
        >
          <GripVertical size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          
          {hasChildren && (
            <button
              onClick={() => toggleNode(unit.id)}
              style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6B7280' }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}

          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${unit.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={18} style={{ color: unit.color }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                {unit.unit_name}
              </span>
              <span style={{ padding: '2px 6px', background: `${unit.color}20`, color: unit.color, borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {TYPE_LABELS[unit.unit_type]}
              </span>
              {!unit.is_active && (
                <span style={{ padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>
                  INACTIVE
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
              {unit.unit_code} · Level {unit.level}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {unit.member_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(16,185,129,0.08)', borderRadius: 6 }}>
                <Users size={12} style={{ color: '#059669' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>{unit.member_count}</span>
              </div>
            )}

            <button
              onClick={() => openCreateModal(unit)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              title="Add child unit"
            >
              <Plus size={14} />
            </button>

            <button
              onClick={() => openEditModal(unit)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              title="Edit unit"
            >
              <Edit2 size={14} />
            </button>

            {unit.level > 0 && (
              <button
                onClick={() => deleteUnit(unit)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                title="Delete unit"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div style={{ marginTop: 6 }}>
            {unit.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const owners = employees.filter(e => e.role === 'admin');

  return (
    <div style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building2 size={24} style={{ color: '#7c3aed' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
              Organizational Structure
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
              Drag & drop to reorganize · {flatList.length} units total
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={syncFromJobPositions}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: syncing ? '#9CA3AF' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
          >
            {syncing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Users size={16} />}
            {syncing ? 'Syncing...' : 'Sync from Job Positions'}
          </button>
          <button
            onClick={() => openCreateModal()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
          >
            <Plus size={16} /> New Unit
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
        </div>
      ) : (
        <div style={{ maxHeight: '70vh', overflow: 'auto', padding: '4px' }}>
          {tree.map(node => renderTreeNode(node))}
        </div>
      )}

      {/* Modal - I'll add this in the next message due to length */}
      
      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px', maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                {modalMode === 'edit' ? 'Edit Unit' : 'New Organizational Unit'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(226,232,240,0.7)', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Unit Code *
                </label>
                <input
                  type="text"
                  value={formData.unit_code}
                  onChange={(e) => setFormData({ ...formData, unit_code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  disabled={modalMode === 'edit'}
                  placeholder="e.g., CREATIVE_TEAM"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: modalMode === 'edit' ? '#F9FAFB' : 'white' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Unit Name *
                </label>
                <input
                  type="text"
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  placeholder="e.g., Creative Team"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Type *
                </label>
                <select
                  value={formData.unit_type}
                  onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as any })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: 'white' }}
                >
                  <option value="company">Company</option>
                  <option value="brand">Brand</option>
                  <option value="product">Product</option>
                  <option value="division">Division</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="unit">Unit</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Color
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ width: '100%', height: 42, padding: '4px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, cursor: 'pointer' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Owner
                </label>
                <select
                  value={formData.owner_username}
                  onChange={(e) => setFormData({ ...formData, owner_username: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: 'white' }}
                >
                  <option value="">-- No Owner --</option>
                  {owners.map(o => (
                    <option key={o.username} value={o.username}>{o.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px 18px', background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', color: '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={saveUnit}
                style={{ flex: 1, padding: '10px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
              >
                {modalMode === 'edit' ? 'Update' : 'Create'} Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
