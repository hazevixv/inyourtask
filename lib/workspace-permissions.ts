export type WorkspaceAccessUser = {
  username?: string;
  role?: string | null;
  full_name?: string | null;
};

function normalizeSuperAdminValue(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const FALLBACK_SUPER_ADMIN_USERNAMES = [
  'hazevixv-admin',
];

function getSuperAdminUsernames() {
  const raw = String(
    process.env.PLATFORM_SUPER_ADMIN_USERNAMES ||
    process.env.PLATFORM_SUPER_ADMIN_USERNAME ||
    ''
  ).trim();

  const envUsernames = raw
    ? raw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  return Array.from(new Set([...FALLBACK_SUPER_ADMIN_USERNAMES, ...envUsernames]));
}

export function isWorkspaceAdminUser(user?: WorkspaceAccessUser | null) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin';
}

export function isPlatformSuperAdminUser(user?: WorkspaceAccessUser | null) {
  if (!user?.username && !user?.full_name) return false;
  if (String(user?.role || '').toLowerCase() === 'superadmin') return true;
  const usernames = getSuperAdminUsernames();
  if (usernames.length === 0) return false;
  const candidates = [
    normalizeSuperAdminValue(user.username),
    normalizeSuperAdminValue(user.full_name),
  ].filter(Boolean);
  const allowed = usernames.map((name) => normalizeSuperAdminValue(name)).filter(Boolean);
  return candidates.some((candidate) => allowed.includes(candidate));
}

export function hasWorkspaceAdminAccess(
  user?: WorkspaceAccessUser | null,
  activeWorkspace?: { role?: string | null } | null
) {
  if (isPlatformSuperAdminUser(user)) return true;
  const role = String(activeWorkspace?.role || '').toLowerCase();
  return role === 'owner' || role === 'admin';
}

export function getWorkspaceAccessLabel(user?: WorkspaceAccessUser | null) {
  if (!user) return 'Guest';
  if (isPlatformSuperAdminUser(user)) return 'Super Admin';
  if (String(user.role || '').toLowerCase() === 'superadmin') return 'Super Admin';
  if (String(user.role || '').toLowerCase() === 'admin') return 'Workspace Admin';
  return 'Workspace Member';
}
