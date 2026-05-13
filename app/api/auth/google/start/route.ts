import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

function getRedirectUri(req: NextRequest) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;
}

export async function GET(req: NextRequest) {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri(req);
  const mode = req.nextUrl.searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('include_granted_scopes', 'true');

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });
  response.cookies.set('google_oauth_mode', mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  return response;
}
