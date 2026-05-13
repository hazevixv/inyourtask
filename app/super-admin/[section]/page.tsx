import SuperAdminPage from '../page';

const TAB_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  users: 'users',
  workspaces: 'workspaces',
  aiagent: 'agents',
  aiagents: 'agents',
  'ai-worker': 'agents',
  'ai-workers': 'agents',
  agents: 'agents',
  activity: 'activity',
};

function normalizeSection(section?: string) {
  const raw = String(section || '').trim().toLowerCase();
  const compact = raw
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '');
  return TAB_MAP[compact] || 'dashboard';
}

export default function SuperAdminSectionPage({ params }: { params: { section: string } }) {
  return <SuperAdminPage initialTab={normalizeSection(params.section)} />;
}
