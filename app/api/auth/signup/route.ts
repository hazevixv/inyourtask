import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { WorkspaceModel } from '@/models/WorkspaceModel';
import { AuthModel, type User } from '@/models/AuthModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const full_name = String(body?.full_name || '').trim();
    const password = String(body?.password || '');
    const email = body?.email ? String(body.email).trim() : null;
    const workspaceName = body?.workspace_name ? String(body.workspace_name).trim() : '';
    const workspaceType = body?.workspace_type || (workspaceName ? 'team' : 'personal');
    const inviteCode = body?.invite_code ? String(body.invite_code).trim() : '';

    if (!username || !full_name || !password) {
      return NextResponse.json({ success: false, error: 'Username, full name, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (workspaceType === 'team' && !workspaceName) {
      return NextResponse.json({ success: false, error: 'Workspace name is required for team workspace' }, { status: 400 });
    }

    if (workspaceType === 'join' && !inviteCode) {
      return NextResponse.json({ success: false, error: 'Invite code is required to join a workspace' }, { status: 400 });
    }

    const existing = await query<Array<{ username: string }>>(
      'SELECT username FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await query<any>(`
      INSERT INTO users (
        username, password, full_name, email, role, is_active
      ) VALUES (?, ?, ?, ?, 'user', 1)
    `, [username, hashedPassword, full_name, email]);

    let workspaceResult: any;
    let joinedWorkspace: any = null;

    if (workspaceType === 'join' && inviteCode) {
      joinedWorkspace = await WorkspaceModel.getInviteByCode(inviteCode);
      if (!joinedWorkspace || !joinedWorkspace.is_active) {
        await query('DELETE FROM users WHERE username = ?', [username]);
        return NextResponse.json({ success: false, error: 'Invite code not found or expired' }, { status: 400 });
      }
      if (joinedWorkspace.expires_at && new Date(joinedWorkspace.expires_at).getTime() < Date.now()) {
        await query('DELETE FROM users WHERE username = ?', [username]);
        return NextResponse.json({ success: false, error: 'Invite code has expired' }, { status: 400 });
      }
      const addResult = await WorkspaceModel.addMember({
        workspaceId: joinedWorkspace.workspace_id,
        username,
        role: joinedWorkspace.role || 'member',
        isPrimary: true,
        joinedBy: username
      });
      if (!addResult.success) {
        await query('DELETE FROM users WHERE username = ?', [username]);
        return NextResponse.json({ success: false, error: addResult.error || 'Failed to join workspace' }, { status: 500 });
      }
      await WorkspaceModel.ensurePrimaryMember(joinedWorkspace.workspace_id, username);
      workspaceResult = { success: true, workspace: await WorkspaceModel.getWorkspaceById(joinedWorkspace.workspace_id) };
    } else {
      workspaceResult = await WorkspaceModel.createWorkspaceForUser({
        username,
        fullName: full_name,
        workspaceName: workspaceName || undefined,
        workspaceType: workspaceType === 'team' ? 'team' : 'personal',
        createdBy: username
      });
    }

    if (!workspaceResult.success || !workspaceResult.workspace) {
      await query('DELETE FROM users WHERE username = ?', [username]);
      return NextResponse.json({ success: false, error: workspaceResult.error || 'Failed to set up workspace' }, { status: 500 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)',
      [username, token, expiresAt]
    );

    const user = await AuthModel.getUserById(Number(inserted.insertId)) as User | null;
    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(username, workspaceResult.workspace.workspace_id);
    const workspaces = await WorkspaceModel.getUserWorkspaces(username);

    const response = NextResponse.json({
      success: true,
      user,
      workspaces,
      activeWorkspace
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    if (activeWorkspace) {
      response.cookies.set('active_workspace_id', activeWorkspace.workspace_id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
