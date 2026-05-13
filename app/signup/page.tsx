'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, Mail, Briefcase, AlertCircle, Chrome, Sparkles, ArrowRight, Users, LogIn } from 'lucide-react';
import styles from '../login/login.module.css';

export default function SignupPage() {
  return <Suspense fallback={null}><SignupContent /></Suspense>;
}

const WS_TYPES = [
  { id: 'personal', label: 'Personal Workspace', desc: 'Work alone, invite later', icon: User },
  { id: 'team',     label: 'Team Workspace',    desc: 'Collaborate with a team', icon: Users },
  { id: 'join',     label: 'Join Existing',      desc: 'Use an invite code',    icon: LogIn },
];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceType, setWorkspaceType] = useState('personal');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleError = searchParams.get('error');

  const getGoogleErrorMessage = (value: string | null) => {
    switch (value) {
      case 'google_not_configured': return 'Google sign-up belum dikonfigurasi di server.';
      case 'google_state_invalid': return 'Sesi Google sign-up tidak valid. Coba ulang lagi.';
      case 'google_token_failed': return 'Gagal mengambil token Google.';
      case 'google_profile_failed': return 'Gagal membaca profil Google.';
      case 'google_user_failed': return 'Gagal menyiapkan akun dari Google.';
      case 'google_callback_failed': return 'Google sign-up gagal di callback.';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, full_name: fullName, email: email || undefined, password,
          workspace_name: workspaceName || undefined,
          workspace_type: workspaceType,
          invite_code: inviteCode || undefined
        }),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        await new Promise(resolve => setTimeout(resolve, 150));
        window.location.href = '/';
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <aside className={styles.heroPanel}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            Start clean
          </div>
          <h2 className={styles.heroTitle}>Create a workspace that fits how your team actually works.</h2>
          <p className={styles.heroCopy}>
            Choose personal, team, or join flow. We keep the onboarding clear so admin, team, and AI setup stays in sync from day one.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <strong>Personal first</strong>
              <span>Spin up a workspace for yourself, then expand later.</span>
            </div>
            <div className={styles.heroStat}>
              <strong>Invite ready</strong>
              <span>Join existing workspaces with invite codes when you are ready.</span>
            </div>
          </div>
          <div className={styles.heroList}>
            <div>Set up a workspace in minutes</div>
            <div>Keep data scoped properly from the start</div>
            <div>Unlock AI, chat, projects, and tasks in one place</div>
          </div>
        </aside>

        <section className={styles.card}>
          <div className={styles.logo}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#grad)" />
              <path d="M14 24L21 31L34 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#3d6ba3" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className={styles.title}>Get started</h1>
          <p className={styles.subtitle}>Create an account and set up your workspace.</p>

          {googleError && (
            <div className={styles.error} style={{ marginBottom: 16 }}>
              <AlertCircle size={16} />
              <span>{getGoogleErrorMessage(googleError)}</span>
            </div>
          )}

          <button type="button" className={styles.secondaryBtn} onClick={() => window.location.href = '/api/auth/google/start?mode=signup'}>
            <Chrome size={16} /> Continue with Google
          </button>

          <div className={styles.divider}>or create with email</div>

          <div className={styles.wsTypeGroup}>
            {WS_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button"
                  className={`${styles.wsTypeBtn} ${workspaceType === t.id ? styles.wsTypeBtnActive : ''}`}
                  onClick={() => setWorkspaceType(t.id)}>
                  <Icon size={20} />
                  <div>
                    <div className={styles.wsTypeLabel}>{t.label}</div>
                    <div className={styles.wsTypeDesc}>{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <div className={styles.inputWrapper}>
                  <User size={20} className={styles.inputIcon} />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="username" required autoFocus className={styles.input} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Full name</label>
                <div className={styles.inputWrapper}>
                  <Briefcase size={20} className={styles.inputIcon} />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your display name" required className={styles.input} />
                </div>
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <div className={styles.inputWrapper}>
                  <Mail size={20} className={styles.inputIcon} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)" className={styles.input} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.inputIcon} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required className={styles.input} />
                </div>
              </div>
            </div>

            {workspaceType === 'join' ? (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Invite code</label>
                <div className={styles.inputWrapper}>
                  <LogIn size={20} className={styles.inputIcon} />
                  <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your invite code" required className={styles.input} />
                </div>
              </div>
            ) : (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Workspace name</label>
                <div className={styles.inputWrapper}>
                  <Briefcase size={20} className={styles.inputIcon} />
                  <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder={workspaceType === 'team' ? 'Team workspace name' : 'Optional workspace name'}
                    required={workspaceType === 'team'} className={styles.input} />
                </div>
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.signInBtn}>
              {loading ? <><span className={styles.spinner}></span> Creating account...</>
              : workspaceType === 'join' ? 'Join workspace' : 'Create workspace'}
            </button>
          </form>

          <button type="button" onClick={() => router.push('/login')} className={styles.secondaryBtn} style={{ marginTop: 18 }}>
            <Sparkles size={16} /> Already have an account <ArrowRight size={16} />
          </button>

          <p className={styles.helperText}>
            {workspaceType === 'join'
              ? 'Enter the invite code you received from the workspace owner.'
              : 'Your workspace will be ready immediately. You can customize it later.'}
          </p>
        </section>
      </div>
    </div>
  );
}
