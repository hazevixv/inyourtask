import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

/**
 * POST /api/chat/init
 * Seeds a personal AI assistant conversation for the user if it doesn't exist yet.
 * Also auto-delivers role-based agents to the user based on their job_position.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { memberUsernames, activeWorkspace } = await getRequestWorkspaceContext(req);
    const workspaceId = activeWorkspace?.workspace_id || null;

    if ((user as any).job_position) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [user.username, (user as any).job_position, 'system']
      );
    }

    const existingPersonalAgents = await query<any[]>(
      'SELECT * FROM ai_agents WHERE is_personal = 1 AND owner_username = ? AND workspace_id = ? LIMIT 1',
      [user.username, workspaceId]
    );

    let personalAgent = existingPersonalAgents[0] || null;
    if (!personalAgent) {
      // Check personal AI limit before creating
      const limitInfo = await ChatModel.canCreatePersonalAI(user.username);
      if (!limitInfo.allowed) {
        // Don't auto-create; just return what exists
        return NextResponse.json({
          success: true,
          personalConvId: null,
          conversations: [],
          limitReached: true,
          limitInfo
        });
      }

      const firstName = (user.full_name || user.username).split(' ')[0];
      const agentId = `personal-${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const systemPrompt = `Kamu adalah asisten personal AI untuk ${user.full_name || user.username}.
## IDENTITAS KAMU:
- Nama: ${firstName}'s AI Assistant
- Peran: Asisten Personal Eksklusif untuk ${user.full_name || user.username}
- Posisi: ${(user as any).job_position || 'Karyawan'}
## MISI UTAMA:
Kamu adalah asisten personal yang SANGAT memahami ${firstName}. Kamu mengingat semua percakapan, preferensi, kebiasaan kerja, dan konteks pekerjaan ${firstName}.
## CARA KAMU BEKERJA:
1. Personalisasi Total: Selalu panggil user dengan nama "${firstName}"
2. Konteks Pekerjaan: Pahami bahwa ${firstName} bekerja sebagai ${(user as any).job_position || 'karyawan'}
3. Proaktif: Berikan saran, reminder, dan insights yang relevan
4. Bahasa: Gunakan bahasa Indonesia yang hangat dan profesional
5. Memory: Ingat dan referensikan percakapan sebelumnya
## KEPRIBADIAN:
- Hangat, supportif, dan encouraging
- Profesional tapi tidak kaku
- Selalu siap membantu kapanpun
Ingat: Kamu adalah asisten EKSKLUSIF untuk ${firstName}. Prioritas utamamu adalah membantu ${firstName} menjadi lebih produktif dan sukses.`;

      await query(
        `INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, knowledge_base, model, is_personal, owner_username, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agentId,
          workspaceId,
          `${firstName}'s AI`,
          `Asisten personal eksklusif untuk ${user.full_name || user.username}`,
          'Personal Assistant',
          systemPrompt,
          '',
          'openai/gpt-oss-20b',
          1,
          user.username,
          user.username
        ]
      );
      personalAgent = await ChatModel.getAgentById(agentId);
    }

    const personalConvId = await ChatModel.createAIAgentConversation(user.username, personalAgent.agent_id, true, workspaceId);

    const existingMsgs = await ChatModel.getMessages(personalConvId, 1);
    if (existingMsgs.length === 0) {
      const firstName = (user.full_name || user.username).split(' ')[0];
      await ChatModel.sendMessage(
        personalConvId,
        personalAgent.agent_id,
        `Halo ${firstName}! Saya adalah asisten AI personal kamu. Saya akan mengingat preferensi dan konteks percakapan kita. Apa yang bisa saya bantu hari ini?`,
        'ai'
      );
    }

    const availableWorkerAgents = await ChatModel.getAvailableWorkerAgents(user.username, workspaceId);
    const fallbackWorkerAgents = await query<any[]>(`
      SELECT a.agent_id
      FROM ai_agents a
      WHERE a.is_personal = 0
        AND a.is_active = 1
        AND a.is_public = 1
    `, []);
    const workerAgentIds = Array.from(new Set([
      ...availableWorkerAgents.map((a: any) => a.agent_id),
      ...fallbackWorkerAgents.map((a: any) => a.agent_id)
    ]));

    for (const agentId of workerAgentIds) {
      try {
        await ChatModel.createAIAgentConversation(user.username, agentId, false, workspaceId);
      } catch {
        // ignore duplicates
      }
    }

    const userOrgUnits = await query<any[]>(`
      SELECT
        ous.org_unit_id,
        ou.unit_name,
        ou.unit_type,
        ou.color
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1 ${workspaceId ? 'AND ou.workspace_id = ?' : ''}
      ORDER BY ous.is_primary DESC, ou.unit_name ASC
    `, workspaceId ? [user.username, workspaceId] : [user.username]);

    Promise.all(userOrgUnits.map(async (unit) => {
      try {
        const existingGroup = await query<any[]>(`
          SELECT c.conv_id
          FROM chat_conversations c
          WHERE c.type = 'group'
            AND c.name = ?
            ${workspaceId ? 'AND c.workspace_id = ?' : ''}
            AND c.conv_id IN (SELECT conv_id FROM chat_members WHERE username = ?)
          LIMIT 1
        `, workspaceId ? [unit.unit_name, workspaceId, user.username] : [unit.unit_name, user.username]);

        if (existingGroup.length > 0) return;

        const groupLookup = await query<any[]>(
          `SELECT conv_id FROM chat_conversations WHERE type = ? AND name = ? ${workspaceId ? 'AND workspace_id = ?' : ''} LIMIT 1`,
          workspaceId ? ['group', unit.unit_name, workspaceId] : ['group', unit.unit_name]
        );

        if (groupLookup.length > 0) {
          await query(
            'INSERT IGNORE INTO chat_members (conv_id, username, role) VALUES (?, ?, ?)',
            [groupLookup[0].conv_id, user.username, 'member']
          );
        } else {
          const unitMembers = await query<any[]>(
            'SELECT username FROM org_unit_staff WHERE org_unit_id = ?',
            [unit.org_unit_id]
          );
          const members = unitMembers.map((m: any) => m.username).filter((u: string) => u !== user.username);
          const convId = await ChatModel.createGroupConversation(unit.unit_name, members, user.username, workspaceId);
          await ChatModel.sendMessage(convId, 'system', `Grup ${unit.unit_name} telah dibuat.`, 'system');
        }
      } catch {
        // ignore unit errors
      }
    })).catch(() => {});

    const conversations = await ChatModel.getConversationsForUser(user.username, memberUsernames, workspaceId);

    return NextResponse.json({
      success: true,
      personalConvId,
      conversations
    });
  } catch (e: any) {
    console.error('[Chat Init] Error:', e);

    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({
        success: false,
        error: 'Chat database tables not found. Please run CHAT-DATABASE-SETUP.sql first.',
        hint: 'Check 00-documentation/CHAT-DATABASE-SETUP.sql and run it in MySQL',
        sqlError: e.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: e.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}
