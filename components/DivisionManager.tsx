'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Plus, Edit2, Trash2, X, Loader2, UserCog, Shield } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

interface Division {
  id: number;
  division_code: string;
  division_name: string;
  division_type: 'division' | 'brand' | 'product' | 'event';
  manager_username?: string;
  manager_name?: string;
  manager_avatar?: string;
  direksi_username?: string;
  direksi_name?: string;
  direksi_avatar?: string;
  staff_count: number;
  description?: string;
  is_active: number;
}

interface DivisionManagerProps {
  showToast?: (message: string, type: 'success' | 'error') => void;
}

export default function DivisionManager({ showToast }: DivisionManagerProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState({
    division_code: '',
    division_name: '',
    division_type: 'division' as 'division' | 'brand' | 'product' | 'event',
    manager_username: '',
    direksi_username: '',
    description: ''
  });

  useEffect(() => {
    loadDivisions();
    loadEmployees();
  }, []);

  const loadDivisions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hierarchy/divisions');
      const data = await res.json();
      if (data.success) {
        setDivisions(data.divisions);
      }
    } catch (error) {
      showToast?.('Failed to load divisions', 'error');
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

  const openModal = (division?: Division) => {
    if (division) {
      setEditingDivision(division);
      setFormData({
        division_code: division.division_code,
        division_name: division.division_name,
        division_type: division.division_type,
        manager_username: division.manager_username || '',
        direksi_username: division.direksi_username || '',
        description: division.description || ''
      });
    } else {
      setEditingDivision(null);
      setFormData({
        division_code: '',
        division_name: '',
        division_type: 'division',
        manager_username: '',
        direksi_username: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const saveDivision = async () => {
    if (!formData.division_code || !formData.division_name) {
      showToast?.('Division code and name are required', 'error');
      return;
    }

    try {
      const url = '/api/hierarchy/divisions';
      const method = editingDivision ? 'PUT' : 'POST';
      const body = editingDivision 
        ? { ...formData, id: editingDivision.id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(editingDivision ? 'Division updated!' : 'Division created!', 'success');
        setShowModal(false);
        loadDivisions();
      } else {
        showToast?.(data.error || 'Failed to save division', 'error');
      }
    } catch (error) {
      showToast?.('Error saving division', 'error');
    }
  };

  const managers = employees.filter(e => e.role === 'admin');
  const direksiList: any[] = [];

  return (
    <div style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building2 size={24} style={{ color: '#7c3aed' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
              Division Management
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
              Manage divisions, brands, products, and events with hierarchy
            </p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
        >
          <Plus size={16} /> New Division
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {divisions.map(div => (
            <div key={div.id} style={{ padding: '18px 20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(99,102,241,0.04))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, transition: 'all 140ms' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                      {div.division_name}
                    </h3>
                    <span style={{ padding: '2px 8px', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {div.division_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace', marginBottom: 8 }}>
                    {div.division_code}
                  </div>
                </div>
                <button
                  onClick={() => openModal(div)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                >
                  <Edit2 size={14} />
                </button>
              </div>

              {div.description && (
                <p style={{ fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.5, marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                  {div.description}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {div.direksi_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                    <Shield size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginBottom: 2 }}>DIREKSI</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {div.direksi_name}
                      </div>
                    </div>
                  </div>
                )}

                {div.manager_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8 }}>
                    <UserCog size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, marginBottom: 2 }}>MANAGER</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {div.manager_name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
                <Users size={14} style={{ color: '#059669' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669', fontFamily: 'DM Sans, sans-serif' }}>
                  {div.staff_count} Staff Member{div.staff_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px', maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                {editingDivision ? 'Edit Division' : 'New Division'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(226,232,240,0.7)', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Division Code *
                </label>
                <input
                  type="text"
                  value={formData.division_code}
                  onChange={(e) => setFormData({ ...formData, division_code: e.target.value.toUpperCase() })}
                  disabled={!!editingDivision}
                  placeholder="e.g., CREATIVE, IT_SUPPORT"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: editingDivision ? '#F9FAFB' : 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Division Name *
                </label>
                <input
                  type="text"
                  value={formData.division_name}
                  onChange={(e) => setFormData({ ...formData, division_name: e.target.value })}
                  placeholder="e.g., Creative Team"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Type
                </label>
                <select
                  value={formData.division_type}
                  onChange={(e) => setFormData({ ...formData, division_type: e.target.value as any })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: 'white' }}
                >
                  <option value="division">Division</option>
                  <option value="brand">Brand</option>
                  <option value="product">Product</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Direksi
                </label>
                <select
                  value={formData.direksi_username}
                  onChange={(e) => setFormData({ ...formData, direksi_username: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: 'white' }}
                >
                  <option value="">-- No Direksi --</option>
                  {direksiList.map(d => (
                    <option key={d.username} value={d.username}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Manager
                </label>
                <select
                  value={formData.manager_username}
                  onChange={(e) => setFormData({ ...formData, manager_username: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', background: 'white' }}
                >
                  <option value="">-- No Manager --</option>
                  {managers.map(m => (
                    <option key={m.username} value={m.username}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this division..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px 18px', background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', color: '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveDivision}
                  style={{ flex: 1, padding: '10px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}
                >
                  {editingDivision ? 'Update' : 'Create'} Division
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
