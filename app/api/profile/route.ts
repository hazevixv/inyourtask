import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

/**
 * GET /api/profile
 * Get current user profile
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get full user profile
    const users = await query<any[]>(
      `SELECT 
        username, 
        full_name, 
        employee_id, 
        email, 
        job_position, 
        organization, 
        avatar, 
        bio, 
        phone, 
        is_active, 
        last_login, 
        created_at 
      FROM users 
      WHERE username = ?`,
      [user.username]
    );

    if (!users[0]) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: users[0] });
  } catch (e: any) {
    console.error('[Profile GET] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 * Update current user profile
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, email, job_position, organization, bio, phone, avatar } = body;

    // Validate required fields
    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email && email.trim()) {
      const existingUsers = await query<any[]>(
        'SELECT username FROM users WHERE email = ? AND username != ?',
        [email.trim(), user.username]
      );
      if (existingUsers.length > 0) {
        return NextResponse.json({ success: false, error: 'Email already taken by another user' }, { status: 400 });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (full_name && full_name.trim()) {
      updates.push('full_name = ?');
      values.push(full_name.trim());
    }

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email ? email.trim() : null);
    }

    if (job_position !== undefined) {
      updates.push('job_position = ?');
      values.push(job_position ? job_position.trim() : null);
    }

    if (organization !== undefined) {
      updates.push('organization = ?');
      values.push(organization ? organization.trim() : null);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio ? bio.trim() : null);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone ? phone.trim() : null);
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar ? avatar.trim() : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Add username to values for WHERE clause
    values.push(user.username);

    // Execute update
    await query<ResultSetHeader>(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE username = ?`,
      values
    );

    // Get updated profile
    const updatedUsers = await query<any[]>(
      `SELECT 
        username, 
        full_name, 
        employee_id, 
        email, 
        job_position, 
        organization, 
        avatar, 
        bio, 
        phone, 
        is_active, 
        last_login, 
        created_at,
        updated_at
      FROM users 
      WHERE username = ?`,
      [user.username]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: updatedUsers[0] 
    });
  } catch (e: any) {
    console.error('[Profile PUT] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
