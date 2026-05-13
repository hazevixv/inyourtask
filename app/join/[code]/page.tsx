'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params?.code || '').trim();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const res = await fetch(`/api/workspaces/invites/${encodeURIComponent(code)}`, { credentials: 'include' });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Invite not found');
          return;
        }
        setInvite(json.invite);
      } catch {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    if (code) loadInvite();
    else {
      setError('Invalid invite code');
      setLoading(false);
    }
  }, [code]);

  const acceptInvite = async () => {
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`/api/workspaces/invites/${encodeURIComponent(code)}`, {
        method: 'POST',
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 401) {
          router.push(`/login`);
          return;
        }
        setError(json.error || 'Failed to join workspace');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Failed to join workspace');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, #f8f7ff, #eef2ff)' }}>
      <div style={{ width: 'min(560px, calc(100vw - 32px))', background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(124,58,237,0.12)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Workspace Invite</div>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: 0, color: '#0f172a' }}>
          {loading ? 'Loading invite...' : invite?.workspace?.name || 'Join workspace'}
        </h1>
        <p style={{ marginTop: 10, color: '#475569', lineHeight: 1.6 }}>
          {loading ? 'Please wait while we check this invite.' : invite?.workspace?.description || `You will join as ${invite?.role || 'member'}.`}
        </p>

        {!loading && invite?.workspace && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(148,163,184,0.18)' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{invite.workspace.name}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
              Role: {invite.role} · Type: {invite.workspace.type}
            </div>
            {invite.email ? (
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                Invite email: {invite.email}
              </div>
            ) : null}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={acceptInvite}
            disabled={loading || joining || !invite?.workspace}
            style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            {joining ? 'Joining...' : 'Join Workspace'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.25)', background: '#fff', color: '#4c1d95', fontWeight: 700, cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
