'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Briefcase, Building2, Phone, FileText, Camera, Save, X, Loader2, Shield, BadgeInfo, Sparkles } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import ImageCropper from '@/components/ImageCropper';
import { useApp } from '@/lib/AppContext';
import { getDisplayName, getAvatarUrl, DEFAULT_AVATAR_URL } from '@/lib/utils';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast, activeWorkspace, loadData, loadConfig, setActiveWorkspace } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceArchiving, setWorkspaceArchiving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    job_position: '',
    organization: '',
    bio: '',
    phone: '',
    avatar: ''
  });
  const [workspaceData, setWorkspaceData] = useState({
    workspace_id: '',
    name: '',
    description: ''
  });

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/profile');
      const data = await res.json();
      
      if (data.success) {
        const nextProfile = data.profile;
        setProfile(nextProfile);
        setFormData({
          full_name: nextProfile.full_name || '',
          email: nextProfile.email || '',
          job_position: nextProfile.job_position || user?.job_position || '',
          organization: nextProfile.organization || activeWorkspace?.name || '',
          bio: nextProfile.bio || '',
          phone: nextProfile.phone || '',
          avatar: nextProfile.avatar || ''
        });
        setWorkspaceData({
          workspace_id: activeWorkspace?.workspace_id || '',
          name: activeWorkspace?.name || '',
          description: activeWorkspace?.description || ''
        });
      } else {
        showToast(data.error || 'Failed to load profile', 'error');
      }
    } catch (err) {
      showToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.description, activeWorkspace?.name, activeWorkspace?.workspace_id, showToast, user?.job_position]);

  useEffect(() => {
    if (!authChecked || !user) return;
    loadProfile();
  }, [authChecked, user, loadProfile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate
    if (!formData.full_name.trim()) {
      showToast('Full name is required', 'error');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast('Invalid email format', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setProfile(data.profile);
        setFormData({
          full_name: data.profile.full_name || '',
          email: data.profile.email || '',
          job_position: data.profile.job_position || '',
          organization: data.profile.organization || '',
          bio: data.profile.bio || '',
          phone: data.profile.phone || '',
          avatar: data.profile.avatar || ''
        });
        showToast('Profile updated successfully', 'success');
        await Promise.allSettled([loadProfile(), loadConfig()]);
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        job_position: profile.job_position || user?.job_position || '',
        organization: profile.organization || activeWorkspace?.name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        avatar: profile.avatar || ''
      });
    }
    setWorkspaceData({
      workspace_id: activeWorkspace?.workspace_id || '',
      name: activeWorkspace?.name || '',
      description: activeWorkspace?.description || ''
    });
  };

  const handleWorkspaceSave = async () => {
    if (!workspaceData.workspace_id) {
      showToast('Workspace not available', 'error');
      return;
    }

    try {
      setWorkspaceSaving(true);
      const res = await fetch('/api/workspaces/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceData.workspace_id,
          name: workspaceData.name,
          description: workspaceData.description
        })
      });

      const data = await res.json();
      if (data.success) {
        setWorkspaceData({
          workspace_id: data.activeWorkspace?.workspace_id || workspaceData.workspace_id,
          name: data.activeWorkspace?.name || workspaceData.name,
          description: data.activeWorkspace?.description || workspaceData.description
        });
        await Promise.allSettled([
          setActiveWorkspace(workspaceData.workspace_id),
          loadData(),
          loadConfig()
        ]);
        showToast('Workspace updated successfully', 'success');
      } else {
        showToast(data.error || 'Failed to update workspace', 'error');
      }
    } catch {
      showToast('Error updating workspace', 'error');
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const handleWorkspaceArchive = async () => {
    if (!workspaceData.workspace_id || !canEditWorkspace) {
      showToast('Workspace not available', 'error');
      return;
    }

    const confirmed = window.confirm(
      'Archive workspace ini? Workspace akan disembunyikan dari daftar aktif dan kamu akan dipindahkan ke workspace lain jika tersedia.'
    );
    if (!confirmed) return;

    try {
      setWorkspaceArchiving(true);
      const res = await fetch('/api/workspaces/active', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceData.workspace_id })
      });

      const data = await res.json();
      if (data.success) {
        if (data.activeWorkspace?.workspace_id) {
          await setActiveWorkspace(data.activeWorkspace.workspace_id);
        }
        await Promise.allSettled([loadData(), loadConfig()]);
        showToast('Workspace archived successfully', 'success');
        router.push('/');
      } else {
        showToast(data.error || 'Failed to archive workspace', 'error');
      }
    } catch {
      showToast('Error archiving workspace', 'error');
    } finally {
      setWorkspaceArchiving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    // Show cropper instead of uploading directly
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropperSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropperSrc(null);
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      const res = await fetch('/api/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar: data.avatarPath }));
        setProfile((prev: any) => prev ? { ...prev, avatar: data.avatarPath } : prev);
        showToast('Avatar updated!', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!authChecked) return <PageLoader />;

  const displayName = getDisplayName(profile?.full_name || user?.full_name || user?.username);
  const avatarUrl = getAvatarUrl(profile?.avatar || user?.avatar);
  const workspaceName = activeWorkspace?.name || profile?.organization || 'Personal workspace';
  const workspaceRole = activeWorkspace?.role || user?.role || 'member';
  const workspaceType = activeWorkspace?.type || 'workspace';
  const canEditWorkspace = hasWorkspaceAdminAccess(user as any, activeWorkspace);

  return (
    <>
      <AppShell 
        activeTab="profile" 
        user={user} 
        onLogout={handleLogout} 
        pageTitle="Profile"
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => router.push('/projects')}
      >
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={32} className={styles.spinning} />
              <p>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className={styles.header}>
                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className={styles.avatar}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.dataset.fallbackApplied) return;
                        img.dataset.fallbackApplied = '1';
                        img.src = DEFAULT_AVATAR_URL;
                      }}
                    />
                    <button
                      className={styles.avatarBtn}
                      title="Change avatar"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? <Loader2 size={16} className={styles.spinning} /> : <Camera size={16} />}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                        e.target.value = '';
                      }}
                    />                  </div>
                  <div className={styles.headerInfo}>
                    <div className={styles.headerEyebrow}>
                      <Sparkles size={14} />
                      Profile Center
                    </div>
                    <h1>{displayName}</h1>
                    <p className={styles.username}>@{profile?.username || user?.username}</p>
                    <div className={styles.metaRow}>
                      <span className={styles.metaChip}>{workspaceName}</span>
                      <span className={styles.metaChipMuted}>{workspaceRole}</span>
                      <span className={styles.metaChipMuted}>{workspaceType}</span>
                    </div>
                    {profile?.employee_id && (
                      <p className={styles.employeeId}>ID: {profile.employee_id}</p>
                    )}
                    <p className={styles.headerSummary}>
                      Rapikan identitas personal, info kerja, dan detail workspace aktif dari satu tempat tanpa reload penuh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className={styles.form}>
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2>Personal Information</h2>
                      <p className={styles.sectionHint}>Informasi ini dipakai untuk nama tampilan, notifikasi, dan profil chat.</p>
                    </div>
                  </div>
                  
                  <div className={styles.field}>
                    <label>
                      <User size={16} />
                      Full Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={e => handleChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                    <small>This will be displayed as your name throughout the app</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Mail size={16} />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                    />
                    <small>Used for notifications and direct messages</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Phone size={16} />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2>Work Information</h2>
                      <p className={styles.sectionHint}>Bantu tim mengenali peran Anda di workspace dengan jelas.</p>
                    </div>
                  </div>
                  
                  <div className={styles.field}>
                    <label>
                      <Briefcase size={16} />
                      Job Position
                    </label>
                    <input
                      type="text"
                      value={formData.job_position}
                      onChange={e => handleChange('job_position', e.target.value)}
                      placeholder="e.g., Creative Director, IT Support"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Building2 size={16} />
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={e => handleChange('organization', e.target.value)}
                      placeholder={workspaceName}
                    />
                    <small>Use this for your workspace or company name if you want it visible on your profile.</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <FileText size={16} />
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={e => handleChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                    <small>A brief description about you and your role</small>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2>Workspace Information</h2>
                      <p className={styles.sectionHint}>Kelola workspace yang sedang aktif tanpa keluar dari halaman ini.</p>
                    </div>
                    <div className={styles.roleBadge}>
                      <BadgeInfo size={14} />
                      {canEditWorkspace ? 'Workspace admin access' : 'View only'}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Building2 size={16} />
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceData.name}
                      onChange={e => setWorkspaceData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={workspaceName}
                      disabled={!canEditWorkspace}
                    />
                    <small>{canEditWorkspace ? 'Visible to members in this workspace.' : 'Only workspace owners/admins can edit this.'}</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <FileText size={16} />
                      Workspace Description
                    </label>
                    <textarea
                      value={workspaceData.description}
                      onChange={e => setWorkspaceData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Short description of this workspace"
                      rows={3}
                      disabled={!canEditWorkspace}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Shield size={16} />
                      Workspace Role
                    </label>
                    <input
                      type="text"
                      value={`${workspaceRole} (${workspaceType})`}
                      readOnly
                      disabled
                    />
                    <small>Your current access in the selected workspace.</small>
                  </div>

                  <div className={styles.actionsInline}>
                    <button
                      className={styles.btnCancel}
                      type="button"
                      onClick={handleCancel}
                      disabled={saving || workspaceSaving || workspaceArchiving}
                    >
                      <X size={16} />
                      Reset
                    </button>
                    <button
                      className={styles.btnSave}
                      type="button"
                      onClick={handleWorkspaceSave}
                      disabled={workspaceSaving || !canEditWorkspace}
                    >
                      {workspaceSaving ? (
                        <>
                          <Loader2 size={16} className={styles.spinning} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Workspace
                        </>
                      )}
                    </button>
                    <button
                      className={styles.btnDanger}
                      type="button"
                      onClick={handleWorkspaceArchive}
                      disabled={workspaceArchiving || !canEditWorkspace}
                    >
                      {workspaceArchiving ? (
                        <>
                          <Loader2 size={16} className={styles.spinning} />
                          Archiving...
                        </>
                      ) : (
                        <>
                          <X size={16} />
                          Archive Workspace
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.actions}>
                  <div className={styles.actionsCopy}>
                    <strong>Profile changes</strong>
                    <span>Simpan perubahan profil tanpa refresh seluruh aplikasi.</span>
                  </div>
                  <button 
                    className={styles.btnCancel} 
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button 
                    className={styles.btnSave} 
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className={styles.spinning} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>

      <MobileHeader title="Profile" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="profile" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Image Cropper Modal */}
      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          onCrop={handleCropComplete}
          onCancel={() => setCropperSrc(null)}
          outputSize={400}
        />
      )}
    </>
  );
}
