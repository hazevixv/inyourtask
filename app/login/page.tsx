'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, AlertCircle, Chrome, Sparkles, ArrowRight } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleError = searchParams.get('error');

  const getGoogleErrorMessage = (value: string | null) => {
    switch (value) {
      case 'google_not_configured':
        return 'Google sign-in belum dikonfigurasi di server.';
      case 'google_state_invalid':
        return 'Sesi Google login tidak valid. Coba ulang lagi.';
      case 'google_token_failed':
        return 'Gagal mengambil token Google.';
      case 'google_profile_failed':
        return 'Gagal membaca profil Google.';
      case 'google_user_failed':
        return 'Gagal menyiapkan akun dari Google.';
      case 'google_callback_failed':
        return 'Google login gagal di callback.';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 150));
        // Force full page navigation to trigger AppContext re-init
        window.location.href = '/';
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
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
            Workspace native
          </div>
          <h2 className={styles.heroTitle}>One place for tasks, chat, AI, and your team.</h2>
          <p className={styles.heroCopy}>
            Sign in to continue inside your workspace with a UI that matches the product: calm, structured, and built for daily use.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <strong>Workspace-aware</strong>
              <span>Data, roles, and AI follow your active workspace.</span>
            </div>
            <div className={styles.heroStat}>
              <strong>AI connected</strong>
              <span>Personal AI, worker AI, and chat all share the same source of truth.</span>
            </div>
          </div>
          <div className={styles.heroList}>
            <div>Login with username, password, or Google</div>
            <div>Jump into the correct workspace instantly</div>
            <div>Keep admin, team, and super-admin flows separated</div>
          </div>
        </aside>

        <section className={styles.card}>
          <div className={styles.logo}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#gradient)" />
              <path d="M14 24L21 31L34 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className={styles.title}>inyourtask</h1>
          <p className={styles.subtitle}>Sign in to your workspace</p>

          {googleError && (
            <div className={styles.error} style={{ marginBottom: 16 }}>
              <AlertCircle size={16} />
              <span>{getGoogleErrorMessage(googleError)}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => window.location.href = '/api/auth/google/start?mode=login'}
          >
            <Chrome size={16} />
            Continue with Google
          </button>

          <div className={styles.divider}>or use your workspace account</div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Username</label>
              <div className={styles.inputWrapper}>
                <User size={20} className={styles.inputIcon} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  autoFocus
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.signInBtn}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push('/signup')}
            className={styles.secondaryBtn}
            style={{ marginTop: 18 }}
          >
            <Sparkles size={16} />
            Create new workspace account
            <ArrowRight size={16} />
          </button>

          <p className={styles.helperText}>
            Use your username and password to continue. For Google sign-in, browser login works after OAuth is configured.
          </p>
        </section>
      </div>
    </div>
  );
}
