'use client';

import { useState } from 'react';
import ViewSettingsPanel from '@/components/ViewSettingsPanel';
import { ViewPreferences, getDefaultPreferences } from '@/lib/viewPersistence';

/**
 * Test page for ViewSettingsPanel component
 * This page is for development/testing purposes only
 */
export default function TestViewSettingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<ViewPreferences>(
    getDefaultPreferences('tasks')
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>ViewSettingsPanel Test Page</h1>
      <p>Click the button below to open the ViewSettingsPanel modal.</p>
      
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: '700',
          marginTop: '20px',
        }}
      >
        Open View Settings Panel
      </button>

      <div style={{ marginTop: '40px' }}>
        <h2>Current Preferences:</h2>
        <pre style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          overflow: 'auto'
        }}>
          {JSON.stringify(preferences, null, 2)}
        </pre>
      </div>

      {isOpen && (
        <ViewSettingsPanel
          type="tasks"
          preferences={preferences}
          onUpdate={(prefs) => {
            setPreferences(prefs);
            console.log('Preferences updated:', prefs);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
