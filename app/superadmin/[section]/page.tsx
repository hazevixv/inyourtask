import { redirect } from 'next/navigation';

const TAB_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  users: 'users',
  workspaces: 'workspaces',
  aiagent: 'ai-workers',
  aiagents: 'ai-workers',
  'ai-workers': 'ai-workers',
  'ai-worker': 'ai-workers',
  agents: 'ai-workers',
  activity: 'activity',
};

export default function SuperAdminSectionAliasPage({ params }: { params: { section: string } }) {
  const section = String(params.section || '').toLowerCase();
  const tab = TAB_MAP[section] || 'dashboard';
  redirect(`/super-admin/${tab}`);
}
