import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

const PROFILE_FIELDS = [
  'username',
  'full_name',
  'employee_id',
  'email',
  'job_position',
  'organization',
  'avatar',
  'bio',
  'phone',
  'is_active',
  'last_login',
  'created_at',
  'updated_at'
] as const;

let usersColumnCache: { columns: Set<string>; ts: number } | null = null;
const USERS_COLUMN_CACHE_TTL = 60_000;

async function getUsersColumns() {
  if (usersColumnCache && Date.now() - usersColumnCache.ts < USERS_COLUMN_CACHE_TTL) {
    return usersColumnCache.columns;
  }

  const columns = await query<any[]>('SHOW COLUMNS FROM users');
  const columnSet = new Set(columns.map((column) => String(column.Field)));
  usersColumnCache = { columns: columnSet, ts: Date.now() };
  return columnSet;
}

async function selectProfileByUsername(username: string) {
  const columns = await getUsersColumns();
  const selectClause = PROFILE_FIELDS.map((field) =>
    columns.has(field) ? field : `NULL AS ${field}`
  ).join(', ');

  const users = await query<any[]>(
    `SELECT ${selectClause}
     FROM users
     WHERE username = ?`,
    [username]
  );

  return users[0] || null;
}

function normalizeProfile(profile: any) {
  return {
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    employee_id: profile?.employee_id || null,
    email: profile?.email || '',
    job_position: profile?.job_position || '',
    organization: profile?.organization || '',
    avatar: profile?.avatar || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    is_active: profile?.is_active ?? true,
    last_login: profile?.last_login || null,
    created_at: profile?.created_at || null,
    updated_at: profile?.updated_at || null
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await selectProfileByUsername(user.username);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: normalizeProfile(profile) });
  } catch (e: any) {
    console.error('[Profile GET] Error:', e);
    return NextResponse.json({ success: false, error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, email, job_position, organization, bio, phone, avatar } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    if (email && email.trim()) {
      const existingUsers = await query<any[]>(
        'SELECT username FROM users WHERE email = ? AND username != ?',
        [email.trim(), user.username]
      );
      if (existingUsers.length > 0) {
        return NextResponse.json({ success: false, error: 'Email already taken by another user' }, { status: 400 });
      }
    }

    const columns = await getUsersColumns();
    const updates: string[] = [];
    const values: any[] = [];

    const optionalUpdates: Array<[string, any]> = [
      ['full_name', full_name],
      ['email', email],
      ['job_position', job_position],
      ['organization', organization],
      ['bio', bio],
      ['phone', phone],
      ['avatar', avatar]
    ];

    optionalUpdates.forEach(([field, value]) => {
      if (!columns.has(field)) return;

      if (field === 'full_name') {
        updates.push(`${field} = ?`);
        values.push(String(value || '').trim());
        return;
      }

      if (value !== undefined) {
        updates.push(`${field} = ?`);
        values.push(value ? String(value).trim() : null);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    if (columns.has('updated_at')) {
      updates.push('updated_at = NOW()');
    }

    values.push(user.username);

    await query<ResultSetHeader>(
      `UPDATE users SET ${updates.join(', ')} WHERE username = ?`,
      values
    );

    const updatedProfile = await selectProfileByUsername(user.username);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: normalizeProfile(updatedProfile)
    });
  } catch (e: any) {
    console.error('[Profile PUT] Error:', e);
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
