import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/api-auth';

/**
 * GET /api/chat/sessions?convId=xxx
 * Get all sessions for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const convId = searchParams.get('convId');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');

    if (!convId) {
      return NextResponse.json({ success: false, error: 'convId required' }, { status: 400 });
    }

    const member = await query<any[]>(
      'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
      [convId, user.username]
    );
    if (member.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if chat_sessions table exists
    try {
      await query('SELECT 1 FROM chat_sessions LIMIT 1');
    } catch (tableError: any) {
      // Table doesn't exist - return empty sessions with helpful message
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message?.includes('doesn\'t exist')) {
        console.warn('[CHAT SESSIONS] Table not found. Run migration: migrations/008_chat_sessions.sql');
        return NextResponse.json({ 
          success: true, 
          sessions: [],
          warning: 'Chat sessions table not found. Please run database migration: migrations/008_chat_sessions.sql'
        });
      }
      throw tableError;
    }

    let sql = `
      SELECT 
        s.*,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.session_id = m.session_id
      WHERE s.conv_id = ? AND s.is_archived = FALSE
    `;
    const params: any[] = [convId];

    if (folder && folder !== 'all') {
      sql += ` AND s.folder = ?`;
      params.push(folder);
    }

    if (search) {
      sql += ` AND s.title LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY s.session_id ORDER BY s.is_pinned DESC, s.updated_at DESC`;

    const sessions = await query(sql, params);

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('[CHAT SESSIONS GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions
 * Create new session
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { convId, title, folder } = body;

    if (!convId) {
      return NextResponse.json({ success: false, error: 'convId required' }, { status: 400 });
    }

    const member = await query<any[]>(
      'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
      [convId, user.username]
    );
    if (member.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if chat_sessions table exists
    try {
      await query('SELECT 1 FROM chat_sessions LIMIT 1');
    } catch (tableError: any) {
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message?.includes('doesn\'t exist')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Chat sessions table not found. Please run database migration: migrations/008_chat_sessions.sql'
        }, { status: 503 });
      }
      throw tableError;
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await query(
      `INSERT INTO chat_sessions (session_id, conv_id, title, folder) VALUES (?, ?, ?, ?)`,
      [sessionId, convId, title || 'New Chat', folder || 'general']
    );

    const newSession = await query(
      `SELECT * FROM chat_sessions WHERE session_id = ?`,
      [sessionId]
    );

    return NextResponse.json({ 
      success: true, 
      session: newSession[0],
      sessionId 
    });
  } catch (error: any) {
    console.error('[CHAT SESSIONS POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/chat/sessions
 * Update session (rename, archive, pin, change folder)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, title, folder, isArchived, isPinned } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
    }

    const sessionConv = await query<any[]>(
      'SELECT s.conv_id FROM chat_sessions s WHERE s.session_id = ? LIMIT 1',
      [sessionId]
    );
    if (sessionConv.length > 0) {
      const member = await query<any[]>(
        'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
        [sessionConv[0].conv_id, user.username]
      );
      if (member.length === 0) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (folder !== undefined) {
      updates.push('folder = ?');
      params.push(folder);
    }
    if (isArchived !== undefined) {
      updates.push('is_archived = ?');
      params.push(isArchived);
    }
    if (isPinned !== undefined) {
      updates.push('is_pinned = ?');
      params.push(isPinned);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    params.push(sessionId);

    await query(
      `UPDATE chat_sessions SET ${updates.join(', ')} WHERE session_id = ?`,
      params
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CHAT SESSIONS PUT]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions?sessionId=xxx
 * Delete session (and optionally its messages)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const deleteMessages = searchParams.get('deleteMessages') === 'true';

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
    }

    const sessionConv = await query<any[]>(
      'SELECT s.conv_id FROM chat_sessions s WHERE s.session_id = ? LIMIT 1',
      [sessionId]
    );
    if (sessionConv.length > 0) {
      const member = await query<any[]>(
        'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
        [sessionConv[0].conv_id, user.username]
      );
      if (member.length === 0) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    if (deleteMessages) {
      // Delete all messages in this session
      await query(`DELETE FROM chat_messages WHERE session_id = ?`, [sessionId]);
    } else {
      // Just unlink messages from session
      await query(`UPDATE chat_messages SET session_id = NULL WHERE session_id = ?`, [sessionId]);
    }

    // Delete session
    await query(`DELETE FROM chat_sessions WHERE session_id = ?`, [sessionId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CHAT SESSIONS DELETE]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
