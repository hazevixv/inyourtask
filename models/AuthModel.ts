import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface User extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'user' | 'superadmin';
  job_position: string | null;
  organization: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isExplicitSuperAdminUsername(username?: string | null) {
  return normalizeKey(username) === 'hazevixv-admin';
}

export interface Session extends RowDataPacket {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

export class AuthModel {
  // Login user
  static async login(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const users = await query<User[]>(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username]
      );

      if (users.length === 0) {
        return { success: false, error: 'Invalid username or password' };
      }

      const user = users[0];

      // Compare password with bcrypt hash
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await query<ResultSetHeader>(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt]
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      if (isExplicitSuperAdminUsername(userWithoutPassword.username)) {
        userWithoutPassword.role = 'superadmin';
      }

      return { success: true, user: userWithoutPassword as User, token };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Logout user
  static async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      await query<ResultSetHeader>(
        'DELETE FROM sessions WHERE session_token = ?',
        [token]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Verify session
  static async verifySession(token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const sessions = await query<Session[]>(
        'SELECT * FROM sessions WHERE session_token = ? AND expires_at > NOW()',
        [token]
      );

      if (sessions.length === 0) {
        return { success: false, error: 'Invalid or expired session' };
      }

      const session = sessions[0];
      const users = await query<User[]>(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [session.user_id]
      );

      if (users.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const { password: _, ...userWithoutPassword } = users[0];
      if (isExplicitSuperAdminUsername(userWithoutPassword.username)) {
        userWithoutPassword.role = 'superadmin';
      }
      return { success: true, user: userWithoutPassword as User };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get user by ID
  static async getUserById(userId: number): Promise<User | null> {
    const users = await query<User[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) return null;
    
    const { password: _, ...userWithoutPassword } = users[0];
    return userWithoutPassword as User;
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
    const users = await query<User[]>(
      'SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return users;
  }

  // Clean expired sessions
  static async cleanExpiredSessions(): Promise<void> {
    await query<ResultSetHeader>(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
  }
}
