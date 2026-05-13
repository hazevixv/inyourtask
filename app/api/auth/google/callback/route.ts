import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { AuthModel } from '@/models/AuthModel';
import { WorkspaceModel } from '@/models/WorkspaceModel';

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

function getRedirectUri(req: NextRequest) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;
}

function normalizeUsername(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');
  return base || `google_${Date.now()}`;
}

async function ensureUniqueUsername(base: string) {
  let username = base;
  let suffix = 2;
  while (true) {
    const rows = await query<Array<{ username: string }>>('SELECT username FROM users WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) return username;
    username = `${base}${suffix++}`;
  }
}

async function createSessionForUser(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await query(
    'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
  return token;
}

export async function GET(req: NextRequest) {
  try {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const cookieState = req.cookies.get('google_oauth_state')?.value || '';
    const mode = req.cookies.get('google_oauth_mode')?.value === 'signup' ? 'signup' : 'login';

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }

    if (!code || !state || !cookieState || state !== cookieState) {
      return NextResponse.redirect(new URL('/login?error=google_state_invalid', req.url));
    }

    const redirectUri = getRedirectUri(req);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.redirect(new URL('/login?error=google_token_failed', req.url));
    }

    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    });
    const profile = await userInfoRes.json();
    if (!userInfoRes.ok || !profile?.email) {
      return NextResponse.redirect(new URL('/login?error=google_profile_failed', req.url));
    }

    const email = String(profile.email).trim().toLowerCase();
    const fullName = String(profile.name || profile.given_name || email.split('@')[0]).trim();
    const avatar = profile.picture ? String(profile.picture) : null;

    let users = await query<any[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    let user = users[0] || null;

    if (!user) {
      const baseUsername = normalizeUsername(email.split('@')[0]);
      const username = await ensureUniqueUsername(baseUsername);
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

      await query(
        `INSERT INTO users (
          username, password, full_name, email, avatar, role, is_active
        ) VALUES (?, ?, ?, ?, ?, 'user', 1)`,
        [username, randomPassword, fullName, email, avatar]
      );

      users = await query<any[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      user = users[0] || null;
    } else if (avatar && !user.avatar) {
      await query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE email = ?', [avatar, email]);
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=google_user_failed', req.url));
    }

    await WorkspaceModel.ensureUserWorkspace(user);
    const workspaces = await WorkspaceModel.getUserWorkspaces(user.username);
    const preferredWorkspaceId = req.cookies.get('active_workspace_id')?.value || null;
    const activeWorkspace = await WorkspaceModel.resolveActiveWorkspace(user.username, preferredWorkspaceId);

    const sessionToken = await createSessionForUser(Number(user.id));
    const response = NextResponse.redirect(new URL('/', req.url));

    response.cookies.set('session_token', sessionToken, {
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
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_oauth_mode');

    return response;
  } catch (error) {
    console.error('[GOOGLE OAUTH CALLBACK]', error);
    return NextResponse.redirect(new URL('/login?error=google_callback_failed', req.url));
  }
}
