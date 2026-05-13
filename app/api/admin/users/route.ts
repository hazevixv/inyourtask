import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';
import { WorkspaceModel } from '@/models/WorkspaceModel';

/** GET /api/admin/users - list all users */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  const workspaceName = workspaceContext.activeWorkspace?.name || 'Workspace';
  const users = activeWorkspaceId
    ? await query<any[]>(
        `SELECT DISTINCT
           u.username, u.full_name, u.email, u.avatar, u.role,
           u.is_active, u.phone, u.created_at
         FROM workspace_members wm
         JOIN users u ON u.username = wm.username
         WHERE wm.workspace_id = ?
         ORDER BY u.full_name ASC, u.username ASC`,
        [activeWorkspaceId]
      )
    : await query<any[]>(
        `SELECT username, full_name, email, avatar, role, is_active, phone, created_at
         FROM users ORDER BY full_name ASC`
      );

  return NextResponse.json({ success: true, users });
}

/** POST /api/admin/users - create new user/employee */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;

  const body = await req.json();
  const { username, password, full_name, email, role, phone } = body;

  if (!username || !password || !full_name) {
    return NextResponse.json({ success: false, error: 'username, password, and full_name are required' }, { status: 400 });
  }

  const existing = await query<any[]>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
  }

  if (email) {
    const existingEmail = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users (username, password, full_name, email, role, phone, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [username, hashedPassword, full_name, email || null, role || 'user', phone || null]
  );

  const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  if (activeWorkspaceId) {
    await WorkspaceModel.addMember({
      workspaceId: activeWorkspaceId,
      username,
      role: role === 'admin' ? 'admin' : 'member',
      isPrimary: false,
      joinedBy: adminUser.username
    });
  }

  // Auto-create personal AI assistant
  try {
    const agentId = `agent_${username}_${Date.now()}`;
    const agentName = `${full_name}'s AI Assistant`;

    await query(
      `INSERT INTO ai_agents (agent_id, workspace_id, name, role, system_prompt, model, is_personal, owner_username, created_by, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1, NOW())`,
      [agentId, activeWorkspaceId, agentName, 'Personal Assistant', `You are a personal AI assistant for ${full_name}.`, 'openai/gpt-oss-20b', username, adminUser.username]
    );
  } catch (aiErr) {
    console.error('Failed to create personal AI assistant:', aiErr);
  }

  return NextResponse.json({ success: true, message: 'User created successfully with personal AI assistant' });
}

/** PUT /api/admin/users - update any user */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  const workspaceContext = await getRequestWorkspaceContext(req);
  if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const adminUser = user!;

  const body = await req.json();
  const { username, full_name, email, avatar, role, is_active, phone, password } = body;

  if (!username) return NextResponse.json({ success: false, error: 'username required' }, { status: 400 });

  if (password && password.trim()) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET password = ? WHERE username = ?`,
      [hashedPassword, username]
    );
  }

  await query(
    `UPDATE users SET
      full_name = COALESCE(?, full_name),
      email = COALESCE(?, email),
      avatar = COALESCE(?, avatar),
      role = COALESCE(?, role),
      is_active = COALESCE(?, is_active),
      phone = COALESCE(?, phone),
      updated_at = NOW()
     WHERE username = ?`,
    [full_name, email, avatar, role, is_active, phone, username]
  );

  return NextResponse.json({ success: true });
}
