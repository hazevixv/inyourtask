'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Loader2 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

interface TeamMember {
  username: string;
  full_name: string;
  avatar?: string;
  job_position?: string;
  email?: string;
}

interface TeamMembersManagerProps {
  currentMembers: TeamMember[];
  onUpdate: (members: TeamMember[]) => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

export default function TeamMembersManager({ currentMembers, onUpdate, showToast }: TeamMembersManagerProps) {
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team-members');
      const data = await res.json();
      if (data.success) {
        setAllEmployees(data.employees);
      }
    } catch (error) {
      showToast?.('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addMember = (employee: TeamMember) => {
    if (!currentMembers.find(m => m.username === employee.username)) {
      onUpdate([...currentMembers, employee]);
      showToast?.(`Added ${employee.full_name} to team`, 'success');
    }
    setShowAddModal(false);
    setSearchQuery('');
  };

  const removeMember = (username: string) => {
    onUpdate(currentMembers.filter(m => m.username !== username));
    showToast?.('Team member removed', 'success');
  };

  const filteredEmployees = allEmployees.filter(emp => {
    const matchesSearch = !searchQuery || 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const notAlreadyMember = !currentMembers.find(m => m.username === emp.username);
    
    return matchesSearch && notAlreadyMember;
  });

  return (
    <div style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={20} style={{ color: '#7c3aed' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
            Team Members
          </h3>
          <span style={{ padding: '2px 8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
            {currentMembers.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <Plus size={14} /> Add Member
        </button>
      </div>

      <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
        For task assignees and project owners. Members are auto-assigned based on job role, but you can add more.
      </p>

      {/* Current Members List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {currentMembers.map(member => (
          <div key={member.username} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
              {member.avatar ? (
                <img src={getAvatarUrl(member.avatar)} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                member.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.full_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontFamily: 'DM Sans, sans-serif' }}>
                {member.job_position || 'Team Member'}
              </div>
            </div>
            <button
              onClick={() => removeMember(member.username)}
              style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              title="Remove member"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {currentMembers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
          <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>No team members yet. Click &ldquo;Add Member&rdquo; to get started.</p>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px', maxWidth: 500, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                Add Team Member
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(226,232,240,0.7)', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflow: 'auto' }}>
                {filteredEmployees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                    <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                      {searchQuery ? 'No employees found' : 'All employees are already team members'}
                    </p>
                  </div>
                ) : (
                  filteredEmployees.map(emp => (
                    <button
                      key={emp.username}
                      onClick={() => addMember(emp)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 140ms' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(124,58,237,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = 'rgba(226,232,240,0.7)';
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                        {emp.avatar ? (
                          <img src={getAvatarUrl(emp.avatar)} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          emp.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                          {emp.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                          {emp.username} · {emp.job_position || 'Employee'}
                        </div>
                      </div>
                      <Plus size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
