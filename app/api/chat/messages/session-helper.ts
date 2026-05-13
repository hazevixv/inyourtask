/**
 * Helper functions for chat session management
 * Gracefully handles missing chat_sessions table
 */
import { query } from '@/lib/db';

let sessionTableExists: boolean | null = null;

async function checkSessionTable(): Promise<boolean> {
  if (sessionTableExists !== null) return sessionTableExists;
  try {
    await query('SELECT 1 FROM chat_sessions LIMIT 1');
    sessionTableExists = true;
  } catch (e: any) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.message?.includes("doesn't exist")) {
      sessionTableExists = false;
      console.warn('[SESSION] chat_sessions table not found. Run: migrations/008_chat_sessions.sql');
    } else {
      // Unknown error - assume table exists but has other issue
      sessionTableExists = true;
    }
  }
  return sessionTableExists;
}

/**
 * Get or create session for a conversation.
 * Returns null if chat_sessions table doesn't exist.
 */
export async function getOrCreateSession(convId: string, sessionId?: string): Promise<string | null> {
  const tableExists = await checkSessionTable();
  if (!tableExists) return null;

  try {
    if (sessionId) {
      const existing = await query(
        'SELECT session_id FROM chat_sessions WHERE session_id = ? AND conv_id = ?',
        [sessionId, convId]
      );
      if ((existing as any[]).length > 0) return sessionId;
    }

    // Get default session or create one
    const defaultSession = await query(
      'SELECT session_id FROM chat_sessions WHERE conv_id = ? AND title = ? LIMIT 1',
      [convId, 'General Chat']
    );

    if ((defaultSession as any[]).length > 0) {
      return (defaultSession as any[])[0].session_id;
    }

    // Create default session
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await query(
      'INSERT INTO chat_sessions (session_id, conv_id, title) VALUES (?, ?, ?)',
      [newSessionId, convId, 'General Chat']
    );
    return newSessionId;
  } catch (e: any) {
    console.error('[SESSION] getOrCreateSession error:', e.message);
    return null;
  }
}

/**
 * Update session stats after new message
 */
export async function updateSessionStats(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const tableExists = await checkSessionTable();
  if (!tableExists) return;

  try {
    await query(
      `UPDATE chat_sessions 
       SET message_count = (SELECT COUNT(*) FROM chat_messages WHERE session_id = ?),
           last_message_at = NOW(),
           updated_at = NOW()
       WHERE session_id = ?`,
      [sessionId, sessionId]
    );
  } catch (e: any) {
    console.error('[SESSION] updateSessionStats error:', e.message);
  }
}

/**
 * Auto-generate session title from first message
 */
export async function autoGenerateSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
  if (!sessionId) return;
  const tableExists = await checkSessionTable();
  if (!tableExists) return;

  try {
    const messageCount = await query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?',
      [sessionId]
    );

    if ((messageCount as any[])[0].count === 1) {
      let title = firstMessage.trim();
      title = title.replace(/^(hi|hello|halo|hai|hey|assalamualaikum|selamat pagi|selamat siang|selamat sore|selamat malam)[,!.\s]*/i, '');
      if (title.length > 50) title = title.substring(0, 50).trim() + '...';
      if (title.length < 5) title = 'New Chat';

      await query(
        'UPDATE chat_sessions SET title = ? WHERE session_id = ?',
        [title, sessionId]
      );
    }
  } catch (e: any) {
    console.error('[SESSION] autoGenerateSessionTitle error:', e.message);
  }
}

/**
 * Reset table existence cache (useful for testing)
 */
export function resetSessionTableCache(): void {
  sessionTableExists = null;
}
