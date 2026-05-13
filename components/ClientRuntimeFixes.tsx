'use client';

import { useEffect } from 'react';
import '@/lib/disable-console';
import '@/lib/disable-scroll-warnings';

export default function ClientRuntimeFixes() {
  useEffect(() => {
    // AGGRESSIVE error suppression for Chrome extensions
    const _err = console.error;
    const _warn = console.warn;

    console.error = (...args) => {
      const msg = String(args[0] || '');
      // Block ALL extension-related errors
      if (msg.includes('runtime.lastError') || 
          msg.includes('message port') ||
          msg.includes('clickup') ||
          msg.includes('chrome-ext') ||
          msg.includes('inject_main') ||
          msg.includes('Unchecked runtime')) return;
      
      // Block hydration warnings from extensions
      if (msg.includes('className') && msg.includes('did not match')) {
        if (msg.includes('clickup') || msg.includes('chrome-ext')) return;
      }
      
      _err.apply(console, args);
    };

    console.warn = (...args) => {
      const msg = String(args[0] || '');
      if (msg.includes('React DevTools') || 
          msg.includes('Download the React')) return;
      _warn.apply(console, args);
    };

    // Block unhandled rejections
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason || '');
      if (msg.includes('runtime.lastError') || 
          msg.includes('message port') ||
          msg.includes('clickup')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Block global errors
    const handleError = (e: ErrorEvent) => {
      const msg = String(e.message || '');
      if (msg.includes('runtime.lastError') || 
          msg.includes('message port') ||
          msg.includes('clickup') ||
          msg.includes('inject_main')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection, true);
    window.addEventListener('error', handleError, true);

    return () => {
      console.error = _err;
      console.warn = _warn;
      window.removeEventListener('unhandledrejection', handleRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

  return null;
}
