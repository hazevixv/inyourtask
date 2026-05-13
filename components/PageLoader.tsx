'use client';

import { useEffect, useState } from 'react';

export default function PageLoader() {
  const [showRefresh, setShowRefresh] = useState(false);

  useEffect(() => {
    // If loading takes more than 6 seconds, show a refresh button
    const timer = setTimeout(() => setShowRefresh(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading...</p>
      {showRefresh && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <p style={{ color: '#9CA3AF', fontSize: '12px' }}>Taking too long?</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #5f88b4 0%, #6aa1bf 52%, #76b6b0 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
}
