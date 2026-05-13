import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { msgId, emoji } = await req.json();

    if (!msgId || !emoji) {
      return NextResponse.json({ success: false, error: 'msgId and emoji required' }, { status: 400 });
    }

    // Check if reaction already exists
    const existing = await query<any[]>(
      'SELECT * FROM message_reactions WHERE msg_id = ? AND username = ? AND emoji = ?',
      [msgId, user.username, emoji]
    );

    if (existing.length > 0) {
      // Remove reaction (toggle off)
      await query(
        'DELETE FROM message_reactions WHERE msg_id = ? AND username = ? AND emoji = ?',
        [msgId, user.username, emoji]
      );
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add reaction
      await query(
        'INSERT INTO message_reactions (msg_id, username, emoji) VALUES (?, ?, ?)',
        [msgId, user.username, emoji]
      );
      return NextResponse.json({ success: true, action: 'added' });
    }

  } catch (error: any) {
    console.error('[Reactions] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to toggle reaction'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const msgId = searchParams.get('msgId');

    if (!msgId) {
      return NextResponse.json({ success: false, error: 'msgId required' }, { status: 400 });
    }

    // Get all reactions for this message
    const reactions = await query<any[]>(
      'SELECT emoji, username FROM message_reactions WHERE msg_id = ? ORDER BY created_at ASC',
      [msgId]
    );

    // Group by emoji
    const grouped: Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }> = {};

    for (const reaction of reactions) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false
        };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].users.push(reaction.username);
      if (reaction.username === user.username) {
        grouped[reaction.emoji].hasReacted = true;
      }
    }

    return NextResponse.json({
      success: true,
      reactions: Object.values(grouped)
    });

  } catch (error: any) {
    console.error('[Reactions] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get reactions'
    }, { status: 500 });
  }
}
