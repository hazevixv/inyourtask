import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

// Ensure notifications table exists
async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        body TEXT,
        data JSON,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      )
    `);
  } catch {}
}

/** GET /api/notifications — list notifications for current user */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
      await ensureTable();
    } catch (tableError) {
      console.error('Failed to ensure notifications table:', tableError);
      // Return empty notifications if table creation fails
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0
      });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 50;

    try {
      const whereClause = unreadOnly ? 'WHERE user_id = ? AND is_read = 0' : 'WHERE user_id = ?';
      const notifications = await query<any[]>(
        `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ${limit}`,
        [user.username]
      );

      const unreadCount = await query<any[]>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [user.username]
      );

      return NextResponse.json({
        success: true,
        notifications: notifications || [],
        unreadCount: unreadCount[0]?.count || 0
      });
    } catch (queryError) {
      console.error('Failed to query notifications:', queryError);
      // Return empty notifications if query fails
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0
      });
    }
  } catch (e: any) {
    console.error('Notifications API error:', e);
    return NextResponse.json({ 
      success: true, 
      notifications: [], 
      unreadCount: 0 
    });
  }
}

/** POST /api/notifications — create notification (internal use) */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const { user_id, type, title, body, data } = await req.json();
    const targetUser = user_id || user.username;

    await query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)`,
      [targetUser, type || 'info', title, body || null, data ? JSON.stringify(data) : null]
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** PATCH /api/notifications — mark as read */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const { id, markAll } = await req.json();

    if (markAll) {
      await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.username]);
    } else if (id) {
      await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user.username]);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/** DELETE /api/notifications — delete notification */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === '1';

    if (deleteAll) {
      await query('DELETE FROM notifications WHERE user_id = ?', [user.username]);
    } else if (id) {
      await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, user.username]);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
