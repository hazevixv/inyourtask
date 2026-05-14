import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AIConversation extends RowDataPacket {
  id: number;
  user_id: number;
  session_id: string;
  session_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIMessage extends RowDataPacket {
  id: number;
  conversation_id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export class AIModel {
  // Create new conversation
  static async createConversation(userId: number, sessionName?: string): Promise<{ success: boolean; conversation?: AIConversation; error?: string }> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const name = sessionName || 'New Conversation';

      await query<ResultSetHeader>(
        'INSERT INTO ai_conversations (user_id, session_id, session_name) VALUES (?, ?, ?)',
        [userId, sessionId, name]
      );

      const conversations = await query<AIConversation[]>(
        'SELECT * FROM ai_conversations WHERE session_id = ?',
        [sessionId]
      );

      return { success: true, conversation: conversations[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get conversation by session_id
  static async getConversationBySessionId(sessionId: string, userId?: number): Promise<AIConversation | null> {
    const conversations = await query<AIConversation[]>(
      userId
        ? 'SELECT * FROM ai_conversations WHERE session_id = ? AND user_id = ?'
        : 'SELECT * FROM ai_conversations WHERE session_id = ?',
      userId ? [sessionId, userId] : [sessionId]
    );
    return conversations[0] || null;
  }

  // Get user conversations
  static async getUserConversations(userId: number): Promise<AIConversation[]> {
    return await query<AIConversation[]>(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
  }

  // Save message
  static async saveMessage(conversationId: number, userId: number, role: 'user' | 'assistant', content: string): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(
        'INSERT INTO ai_messages (conversation_id, user_id, role, content) VALUES (?, ?, ?, ?)',
        [conversationId, userId, role, content]
      );

      // Update conversation timestamp
      await query<ResultSetHeader>(
        'UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get conversation messages
  static async getMessages(conversationId: number): Promise<AIMessage[]> {
    return await query<AIMessage[]>(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
  }

  // Update conversation name
  static async updateConversationName(sessionId: string, name: string, userId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(
        userId
          ? 'UPDATE ai_conversations SET session_name = ? WHERE session_id = ? AND user_id = ?'
          : 'UPDATE ai_conversations SET session_name = ? WHERE session_id = ?',
        userId ? [name, sessionId, userId] : [name, sessionId]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete conversation
  static async deleteConversation(sessionId: string, userId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(
        userId
          ? 'DELETE FROM ai_conversations WHERE session_id = ? AND user_id = ?'
          : 'DELETE FROM ai_conversations WHERE session_id = ?',
        userId ? [sessionId, userId] : [sessionId]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Auto-generate conversation name from first message
  static async autoGenerateName(conversationId: number): Promise<void> {
    const messages = await query<AIMessage[]>(
      "SELECT content FROM ai_messages WHERE conversation_id = ? AND role = 'user' ORDER BY created_at ASC LIMIT 1",
      [conversationId]
    );

    if (messages.length > 0) {
      const firstMessage = messages[0].content;
      const name = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...' 
        : firstMessage;

      await query<ResultSetHeader>(
        'UPDATE ai_conversations SET session_name = ? WHERE id = ?',
        [name, conversationId]
      );
    }
  }
}
