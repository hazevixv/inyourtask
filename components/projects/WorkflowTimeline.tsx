'use client';

import { useState } from 'react';
import { 
  CheckCircle, Circle, Clock, AlertCircle, Play, 
  ChevronRight, Edit2, MessageSquare 
} from 'lucide-react';

interface WorkflowStage {
  stage_id: string;
  stage_name: string;
  stage_order: number;
  assigned_division: string;
  assigned_unit_name?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'blocked';
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

interface WorkflowTimelineProps {
  stages: WorkflowStage[];
  onUpdateStatus: (stageId: string, status: string, notes?: string) => void;
  readonly?: boolean;
}

export default function WorkflowTimeline({ 
  stages, 
  onUpdateStatus,
  readonly = false 
}: WorkflowTimelineProps) {
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [notes, setNotes] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'blocked': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={20} />;
      case 'in_progress': return <Play size={20} />;
      case 'blocked': return <AlertCircle size={20} />;
      default: return <Circle size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'blocked': return 'Blocked';
      default: return 'Waiting';
    }
  };

  const handleStatusChange = (stage: WorkflowStage, newStatus: string) => {
    if (readonly) return;
    onUpdateStatus(stage.stage_id, newStatus, notes);
    setSelectedStage(null);
    setNotes('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16,
        position: 'relative'
      }}>
        {/* Vertical line connecting stages */}
        <div style={{
          position: 'absolute',
          left: 19,
          top: 30,
          bottom: 30,
          width: 2,
          background: 'linear-gradient(to bottom, #e5e7eb 0%, #e5e7eb 100%)',
          zIndex: 0
        }} />

        {stages.map((stage, index) => {
          const color = getStatusColor(stage.status);
          const isLast = index === stages.length - 1;

          return (
            <div 
              key={stage.stage_id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                position: 'relative',
                zIndex: 1
              }}
            >
              {/* Status Icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: stage.status === 'waiting' ? 'white' : color,
                border: `3px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stage.status === 'waiting' ? color : 'white',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {getStatusIcon(stage.status)}
              </div>

              {/* Stage Content */}
              <div style={{
                flex: 1,
                background: 'white',
                border: `2px solid ${stage.status === 'in_progress' ? color : '#e5e7eb'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: stage.status === 'in_progress' ? '0 4px 12px rgba(59,130,246,0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: 8
                }}>
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#111827',
                      fontFamily: 'DM Sans, sans-serif',
                      marginBottom: 4
                    }}>
                      {stage.stage_order}. {stage.stage_name}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontFamily: 'DM Sans, sans-serif'
                    }}>
                      {stage.assigned_unit_name || stage.assigned_division}
                    </div>
                  </div>

                  <div style={{
                    padding: '4px 12px',
                    background: `${color}15`,
                    color: color,
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'DM Sans, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {getStatusLabel(stage.status)}
                  </div>
                </div>

                {/* Timestamps */}
                <div style={{ 
                  display: 'flex', 
                  gap: 16, 
                  fontSize: '0.8125rem',
                  color: '#9ca3af',
                  marginBottom: stage.notes ? 12 : 0
                }}>
                  {stage.started_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      Started: {new Date(stage.started_at).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  {stage.completed_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} />
                      Completed: {new Date(stage.completed_at).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {stage.notes && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#f9fafb',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    color: '#374151',
                    borderLeft: '3px solid #7c3aed',
                    marginTop: 12
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      marginBottom: 4,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}>
                      <MessageSquare size={12} />
                      Notes
                    </div>
                    {stage.notes}
                  </div>
                )}

                {/* Action Buttons */}
                {!readonly && stage.status !== 'completed' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    {stage.status === 'waiting' && (
                      <button
                        onClick={() => handleStatusChange(stage, 'in_progress')}
                        style={{
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          border: 'none',
                          borderRadius: 8,
                          color: 'white',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'DM Sans, sans-serif'
                        }}
                      >
                        <Play size={14} /> Start Stage
                      </button>
                    )}
                    {stage.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => setSelectedStage(stage)}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'DM Sans, sans-serif'
                          }}
                        >
                          <CheckCircle size={14} /> Complete Stage
                        </button>
                        <button
                          onClick={() => handleStatusChange(stage, 'blocked')}
                          style={{
                            padding: '6px 14px',
                            background: 'white',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            color: '#dc2626',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'DM Sans, sans-serif'
                          }}
                        >
                          <AlertCircle size={14} /> Mark Blocked
                        </button>
                      </>
                    )}
                    {stage.status === 'blocked' && (
                      <button
                        onClick={() => handleStatusChange(stage, 'in_progress')}
                        style={{
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          border: 'none',
                          borderRadius: 8,
                          color: 'white',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'DM Sans, sans-serif'
                        }}
                      >
                        <Play size={14} /> Resume
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Stage Modal */}
      {selectedStage && (
        <div
          onClick={() => setSelectedStage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: 'min(480px, 90vw)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: 16,
              fontFamily: 'DM Sans, sans-serif'
            }}>
              Complete Stage: {selectedStage.stage_name}
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8,
                fontFamily: 'DM Sans, sans-serif'
              }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add completion notes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelectedStage(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  background: 'white',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(selectedStage, 'completed')}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                <CheckCircle size={16} /> Complete Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
