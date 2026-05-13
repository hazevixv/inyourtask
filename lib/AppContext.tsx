'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AppContextType {
  user: any;
  data: any;
  config: any;
  workspaces: any[];
  activeWorkspace: any;
  loading: boolean;
  authChecked: boolean;
  loadData: () => Promise<void>;
  loadConfig: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  handleLogout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// Per-user in-memory cache with TTL
// Key format: `${username}:${type}` to prevent cross-user cache pollution
const cache: Record<string, { value: any; ts: number }> = {};
const CACHE_TTL = 30_000; // 30 seconds

function getCached(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.value;
  return null;
}
function setCached(key: string, value: any) {
  cache[key] = { value, ts: Date.now() };
}
function clearUserCache(username?: string) {
  if (username) {
    // Clear only this user's cache
    Object.keys(cache).forEach(k => {
      if (k.startsWith(`${username}:`)) delete cache[k];
    });
  } else {
    // Clear all cache
    Object.keys(cache).forEach(k => delete cache[k]);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const currentUsername = useRef<string | null>(null);
  const activeWorkspaceRef = useRef<any>(null);
  const loadDataInFlight = useRef(false);
  const loadConfigInFlight = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const username = currentUsername.current;
    const workspaceId = activeWorkspaceRef.current?.workspace_id || 'none';
    const cacheKey = username ? `${username}:${workspaceId}:data` : 'anon:data';
    const cached = getCached(cacheKey);
    if (cached) { setData(cached); setLoading(false); return; }
    
    if (loadDataInFlight.current) return;
    loadDataInFlight.current = true;

    try {
      setLoading(true);
      const res = await fetch('/api/dashboard', {
        credentials: 'include',
        cache: 'no-store'
      });

      if (res.status === 401) {
        router.replace('/login');
        return;
      }

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.data) {
        setCached(cacheKey, json.data);
        setData(json.data);
        return;
      }

      const fallbackData = {
        projects: [],
        tasks: [],
        stats: { totalProjects: 0, activeTasks: 0, urgent: 0, overdue: 0, avgProgress: 0 }
      };
      setData(fallbackData);
      if (json?.warnings?.length || json?.error) {
        console.warn('[AppContext] Dashboard fallback:', json.error || json.warnings?.[0]);
      }
    } catch (error) {
      console.warn('[AppContext] Dashboard fallback due to network error:', error);
      const fallbackData = {
        projects: [],
        tasks: [],
        stats: { totalProjects: 0, activeTasks: 0, urgent: 0, overdue: 0, avgProgress: 0 }
      };
      setData(fallbackData);
    } finally {
      setLoading(false);
      loadDataInFlight.current = false;
    }
  }, [router]);

  const loadConfig = useCallback(async () => {
    const username = currentUsername.current;
    const workspaceId = activeWorkspaceRef.current?.workspace_id || 'none';
    const cacheKey = username ? `${username}:${workspaceId}:config` : 'anon:config';
    const cached = getCached(cacheKey);
    if (cached) { setConfig(cached); return; }
    if (loadConfigInFlight.current) return;
    loadConfigInFlight.current = true;
    
    let retries = 3;
    while (retries > 0) {
      try {
        // Add timestamp to bypass browser cache
        const timestamp = Date.now();
        const res = await fetch(`/api/config?t=${timestamp}`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(`Config API returned ${res.status}`);
        
        const json = await res.json();
        if (json.success && json.data) {
          setCached(cacheKey, json.data);
          setConfig(json.data);
          loadConfigInFlight.current = false;
          return;
        } else {
          throw new Error('Invalid response from config API');
        }
      } catch (err) {
        console.error('Failed to load config (attempt ' + (4 - retries) + '):', err);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        } else {
          const fallbackConfig = {
            team: [],
            status: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
            priority: ['Low', 'Normal', 'High', 'Urgent', 'Recurring'],
            progress: ['0%', '25%', '50%', '75%', '100%'],
            categories: ['Development', 'Design', 'Marketing', 'Infrastructure'],
            projects: [], projectOptions: [],
            defaults: { default_status: 'Backlog', default_priority: 'Normal', default_progress: '0%', default_category: 'Development' }
          };
          setConfig(fallbackConfig);
        }
      }
    }
    loadConfigInFlight.current = false;
  }, []);

  const refreshData = useCallback(async () => {
    const username = currentUsername.current;
    if (username) clearUserCache(username);
    loadDataInFlight.current = false;
    await loadData();
  }, [loadData]);

  const refreshConfig = useCallback(async () => {
    const username = currentUsername.current;
    if (username) clearUserCache(username);
    loadConfigInFlight.current = false;
    await loadConfig();
  }, [loadConfig]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear this user's cache on logout
      if (currentUsername.current) clearUserCache(currentUsername.current);
      currentUsername.current = null;
      setUser(null);
      setData(null);
      setConfig(null);
      setAuthChecked(false);
      initialized.current = false;
      router.push('/login');
    } catch {
      showToast('Logout failed', 'error');
    }
  }, [router, showToast]);

  const setActiveWorkspace = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch('/api/workspaces/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspace_id: workspaceId })
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error || 'Failed to switch workspace', 'error');
        return;
      }
      setActiveWorkspaceState(json.activeWorkspace || null);
      activeWorkspaceRef.current = json.activeWorkspace || null;
      const username = currentUsername.current;
      if (username) clearUserCache(username);
      await Promise.all([loadData(), loadConfig()]).catch(() => {});
    } catch {
      showToast('Failed to switch workspace', 'error');
    }
  }, [loadData, loadConfig, showToast]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const res = await fetch('/api/auth/session', { 
          credentials: 'include', 
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          setAuthChecked(true);
          router.replace('/login');
          return;
        }
        const json = await res.json();
        if (json.success && json.user) {
          const newUser = json.user;
          const incomingWorkspaces = Array.isArray(json.workspaces) ? json.workspaces : [];
          const incomingActiveWorkspace = json.activeWorkspace || null;
          
          // If user changed (different login), clear old cache
          if (currentUsername.current && currentUsername.current !== newUser.username) {
            clearUserCache(currentUsername.current);
            setData(null);
            setConfig(null);
          }
          
          currentUsername.current = newUser.username;
          setUser(newUser);
          setWorkspaces(incomingWorkspaces);
          setActiveWorkspaceState(incomingActiveWorkspace);
          activeWorkspaceRef.current = incomingActiveWorkspace;
          setAuthChecked(true);
          // Load data and config in parallel, don't block auth
          Promise.all([loadData(), loadConfig()]).catch(() => {});
        } else {
          setAuthChecked(true);
          router.replace('/login');
        }
      } catch (err: any) {
        setAuthChecked(true);
        // Only redirect to login if not an abort error
        if (err?.name !== 'AbortError') {
          router.replace('/login');
        } else {
          // Timeout - retry once
          console.warn('[AppContext] Session check timed out, retrying...');
          initialized.current = false;
        }
      }
    };

    init();
  }, [loadData, loadConfig, router]);

  useEffect(() => {
    activeWorkspaceRef.current = activeWorkspace;
  }, [activeWorkspace]);

  return (
    <AppContext.Provider value={{
      user, data, config, loading, authChecked,
      workspaces, activeWorkspace,
      loadData: refreshData,
      loadConfig: refreshConfig,
      setActiveWorkspace,
      showToast,
      toast,
      handleLogout
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
