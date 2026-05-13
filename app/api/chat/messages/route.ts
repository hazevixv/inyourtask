import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { ProjectModel } from '@/models/ProjectModel';
import { TaskModel } from '@/models/TaskModel';
import { getSessionUser } from '@/lib/api-auth';
import { getGlobalInstructions } from '@/lib/ai-global-instructions';
import { query } from '@/lib/db';
import { groqChatText, hasGroqConfig, inferGroqMode } from '@/lib/groq';
import { getOrCreateSession, updateSessionStats, autoGenerateSessionTitle } from './session-helper';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

// ── GET messages ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const convId = searchParams.get('convId');
    const before = searchParams.get('before');
    const limitParam = searchParams.get('limit');
    if (!convId) return NextResponse.json({ success: false, error: 'convId required' }, { status: 400 });

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const membership = await query<any[]>(
      'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
      [convId, user.username]
    );
    if (membership.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const messages = await ChatModel.getMessages(convId, limit, before || undefined);
    await ChatModel.markAsRead(convId, user.username);
    return NextResponse.json({ success: true, messages });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ── POST send message ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { convId, content, msgType, voiceData, attachments, replyTo, sessionId } = await req.json();
    if (!convId || !content?.trim()) return NextResponse.json({ success: false, error: 'convId and content required' }, { status: 400 });
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const membership = await query<any[]>(
      'SELECT 1 FROM chat_members WHERE conv_id = ? AND username = ? LIMIT 1',
      [convId, user.username]
    );
    if (membership.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get or create session for AI conversations
    const conv = await ChatModel.getConversationById(convId);
    let finalSessionId = sessionId;
    if (conv && (conv.type === 'ai_agent' || conv.type === 'ai_personal')) {
      finalSessionId = await getOrCreateSession(convId, sessionId);
    }

    // Save user message with reply_to and session support
    const userMsg = await ChatModel.sendMessage(convId, user.username, content, msgType || 'text', undefined, voiceData, attachments, replyTo, finalSessionId || undefined);

    // Auto-generate session title from first message
    if (finalSessionId) {
      await autoGenerateSessionTitle(finalSessionId, content);
      await updateSessionStats(finalSessionId);
    }

    // ── Notify other members of this conversation ─────────────────────────
    if (conv && conv.type !== 'ai_agent' && conv.type !== 'ai_personal') {
      try {
        const members = await query<any[]>(
          'SELECT username FROM chat_members WHERE conv_id = ? AND username != ?',
          [convId, user.username]
        );
        const convName = conv.name || user.full_name || user.username;
        const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
        for (const member of members) {
          await query(
            `INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
             VALUES (?, 'chat_message', ?, ?, ?, 0, NOW())`,
            [
              member.username,
              conv.type === 'group' ? `${conv.name || 'Group'}: ${user.full_name || user.username}` : user.full_name || user.username,
              preview,
              JSON.stringify({ conv_id: convId, sender: user.username, msg_id: userMsg.msg_id })
            ]
          );
        }
      } catch (notifErr) {
        // Non-fatal: don't fail message send if notification fails
        console.error('[Notifications] Failed to create chat notifications:', notifErr);
      }
    }
    let aiReply = null;

    if (conv && (conv.type === 'ai_agent' || conv.type === 'ai_personal') && conv.agent_id) {
      const agent = await ChatModel.getAgentById(conv.agent_id);
      if (agent) {
        if (!hasGroqConfig()) {
          aiReply = await ChatModel.sendMessage(convId, agent.agent_id, 'AI features disabled. Add GROQ_API_KEY to .env', 'ai');
        } else {
          const history = await ChatModel.getMessages(convId, 20);
          const memory = await ChatModel.getAgentMemory(agent.agent_id, user.username);

          // Get context
          let contextData: any = {};
          try {
            const [dashRes, logsRes] = await Promise.all([
              fetch(`${req.nextUrl.origin}/api/dashboard`, { headers: { cookie: req.headers.get('cookie') || '' }, cache: 'no-store' }),
              fetch(`${req.nextUrl.origin}/api/logs`, { headers: { cookie: req.headers.get('cookie') || '' }, cache: 'no-store' })
            ]);
            const dashData = dashRes.ok ? await dashRes.json() : null;
            const logsData = logsRes.ok ? await logsRes.json() : null;
            contextData = {
              projects: dashData?.success ? dashData.data.projects : [],
              tasks: dashData?.success ? dashData.data.tasks : [],
              stats: dashData?.success ? dashData.data.stats : {},
              logs: logsData?.success ? logsData.data.slice(0, 20) : []
            };
          } catch {}

          const userContext = {
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            currentProjects: contextData.projects?.slice(0, 5) || [],
            recentTasks: contextData.tasks?.slice(0, 5) || []
          };

          const globalInstructions = getGlobalInstructions(userContext);

          let systemPrompt = `${globalInstructions}\n\n---\n\n# AGENT-SPECIFIC INSTRUCTIONS\n${agent.system_prompt}`;
          if (agent.knowledge_base) systemPrompt += `\n\n# Knowledge Base\n${agent.knowledge_base}`;
          if (Object.keys(memory).length > 0) systemPrompt += `\n\n# Memory about ${user.full_name || user.username}\n${JSON.stringify(memory, null, 2)}`;
          if (conv.type === 'ai_personal') systemPrompt += `\n\n# Personal Context\nThis is a personal conversation with ${user.full_name || user.username}.`;

          if (contextData.projects?.length > 0 || contextData.tasks?.length > 0) {
            systemPrompt += `\n\n# Current Work Context\n## Stats\n- Projects: ${contextData.stats.totalProjects || 0}\n- Active Tasks: ${contextData.stats.activeTasks || 0}\n- Urgent: ${contextData.stats.urgent || 0}\n- Overdue: ${contextData.stats.overdue || 0}`;
            if (contextData.projects.length > 0) {
              systemPrompt += `\n\n## Projects\n${contextData.projects.slice(0, 10).map((p: any) => `- ${p.project_id}: ${p.project_name} (${p.category}) - ${p.status} - ${p.progress}%`).join('\n')}`;
            }
            if (contextData.tasks.length > 0) {
              systemPrompt += `\n\n## Tasks\n${contextData.tasks.slice(0, 15).map((t: any) => `- ${t.task_id}: ${t.task_name} (${t.project_id}) - ${t.status} - ${t.priority} - ${t.progress}`).join('\n')}`;
            }
          }

          const conversationHistory = history.slice(-10).map((msg) => {
            if (msg.sender === user.username) return `User: ${msg.content}`;
            if (msg.msg_type === 'ai') return `Assistant: ${msg.content}`;
            return '';
          }).filter(Boolean).join('\n');

          if (conversationHistory) systemPrompt += `\n\n# Previous Conversation\n${conversationHistory}`;

          // ── AI COMMAND DETECTION ──────────────────────────────────────────
          // Detect if user wants to create task/project via AI
          const lowerContent = content.toLowerCase();
          const isTaskCommand = lowerContent.includes('buat task') || lowerContent.includes('tambah task') || lowerContent.includes('create task') || lowerContent.includes('add task') || lowerContent.includes('bikin task');
          const isProjectCommand = lowerContent.includes('buat project') || lowerContent.includes('tambah project') || lowerContent.includes('create project') || lowerContent.includes('bikin project');

          systemPrompt += `\n\n# SPECIAL CAPABILITIES
Kamu bisa mengeksekusi aksi nyata di sistem ini. Jika user meminta:
- Membuat task: Balas dengan JSON action di akhir pesan: [ACTION:CREATE_TASK:{"task_name":"...","priority":"Normal","status":"Backlog","project_id":"..."}]
- Membuat project: Balas dengan JSON action: [ACTION:CREATE_PROJECT:{"project_name":"...","category":"...","status":"Planning"}]
- Update task: [ACTION:UPDATE_TASK:{"task_id":"...","field":"status","value":"Done"}]
Selalu konfirmasi ke user setelah eksekusi. Format action HARUS tepat.`;

          try {
            const hasActions = isTaskCommand || isProjectCommand || lowerContent.includes('update task') || lowerContent.includes('ubah task');
            const mode = inferGroqMode(content, { hasActions });
            const { text } = await groqChatText({
              mode,
              model: agent.model,
              messages: [
                {
                  role: 'system',
                  content: `${systemPrompt}\n\nRespond in Indonesian. Be helpful, concise, and actionable. Use markdown when appropriate. When offering numbered choices, use a proper markdown ordered list with each option on its own line: 1. ..., 2. ..., 3. .... Do not use keycap number emojis like 1️⃣, 2️⃣, or 3️⃣.`
                },
                {
                  role: 'user',
                  content
                }
              ],
              temperature: mode === 'reasoning' ? 0.35 : 0.6,
              maxTokens: mode === 'reasoning' ? 1800 : 1000
            });

            let replyText = text;

            // ── PARSE AND EXECUTE AI ACTIONS ──────────────────────────────
            const actionMatches = replyText.match(/\[ACTION:([A-Z_]+):(\{[^}]+\})\]/g);
            let actionResults: string[] = [];

            if (actionMatches) {
              for (const actionStr of actionMatches) {
                const match = actionStr.match(/\[ACTION:([A-Z_]+):(\{.*?\})\]/);
                if (!match) continue;
                const [, actionType, jsonStr] = match;
                try {
                  const actionData = JSON.parse(jsonStr);
                  if (actionType === 'CREATE_TASK') {
                    // Get first available project if not specified
                    let projectId = actionData.project_id;
                    if (!projectId && contextData.projects?.length > 0) {
                      projectId = contextData.projects[0].project_id;
                    }
                    if (projectId) {
                      const result = await TaskModel.create({
                        task_name: actionData.task_name,
                        project_id: projectId,
                        status: actionData.status || 'Backlog',
                        priority: actionData.priority || 'Normal',
                        assignees: user.username,
                        workspace_id: workspaceId
                      }, user.full_name || user.username);
                      if (result.success) {
                        actionResults.push(`Task "${actionData.task_name}" berhasil dibuat di project ${projectId} (${result.id}).`);
                      } else {
                        actionResults.push(`Tidak bisa membuat task: ${result.error}`);
                      }
                    } else {
                      actionResults.push('Tidak bisa membuat task: tidak ada project yang tersedia.');
                    }
                  } else if (actionType === 'CREATE_PROJECT') {
                    const validProjectStatuses = ['Planning', 'Active', 'On Hold', 'Closed'];
                    const result = await ProjectModel.create({
                      project_name: actionData.project_name,
                      category: actionData.category || 'Lainnya',
                      status: validProjectStatuses.includes(actionData.status) ? actionData.status : 'Planning',
                      owner: user.username,
                      assignees: user.username,
                      workspace_id: workspaceId
                    }, user.full_name || user.username);

                    if (result.success) {
                      actionResults.push(`Project "${actionData.project_name}" berhasil dibuat (${result.id}).`);
                    } else {
                      actionResults.push(`Tidak bisa membuat project: ${result.error}`);
                    }
                  } else if (actionType === 'UPDATE_TASK') {
                    const allowedFields = ['status', 'priority', 'progress', 'task_name'];
                    if (allowedFields.includes(actionData.field)) {
                      const result = await TaskModel.update(
                        actionData.task_id,
                        { [actionData.field]: actionData.value },
                        user.full_name || user.username
                      );

                      if (result.success) {
                        actionResults.push(`Task ${actionData.task_id} diupdate: ${actionData.field} -> ${actionData.value}.`);
                      } else {
                        actionResults.push(`Tidak bisa update task ${actionData.task_id}: ${result.error}`);
                      }
                    }
                  }
                } catch (actionErr) {
                  actionResults.push(`Error eksekusi aksi: ${actionErr}`);
                }
                // Remove action tag from reply
                replyText = replyText.replace(actionStr, '');
              }
            }

            // Append action results to reply
            if (actionResults.length > 0) {
              replyText = replyText
                .replace(/```(?:json)?\s*```/gi, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              replyText = replyText + '\n\n' + actionResults.join('\n');
            }

            aiReply = await ChatModel.sendMessage(convId, agent.agent_id, replyText.trim(), 'ai');

            // Store memory
            if (conv.type === 'ai_personal') {
              await ChatModel.setAgentMemory(agent.agent_id, user.username, 'last_interaction', new Date().toISOString());
              await ChatModel.setAgentMemory(agent.agent_id, user.username, 'last_topic', content.substring(0, 100));
              const lc = content.toLowerCase();
              if (lc.includes('suka') || lc.includes('prefer') || lc.includes('favorite')) {
                await ChatModel.setAgentMemory(agent.agent_id, user.username, 'preferences', content.substring(0, 200));
              }
            }

            // Create notification for AI action
            if (actionResults.length > 0) {
              try {
                await query(
                  `INSERT INTO notifications (user_id, type, title, body, data, created_at)
                   VALUES (?, 'ai_action', ?, ?, ?, NOW())
                   ON DUPLICATE KEY UPDATE updated_at = NOW()`,
                  [user.username, `AI ${agent.name} mengeksekusi aksi`, actionResults.join(', '), JSON.stringify({ conv_id: convId, agent_id: agent.agent_id })]
                );
              } catch {}
            }

          } catch (aiErr: any) {
            aiReply = await ChatModel.sendMessage(convId, agent.agent_id, `⚠️ Error: ${aiErr.message}. Silakan coba lagi.`, 'ai');
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: userMsg, aiReply });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ── PATCH — edit/delete message ───────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { msgId, action, content } = await req.json();
    if (!msgId || !action) return NextResponse.json({ success: false, error: 'msgId and action required' }, { status: 400 });

    const msgs = await query<any[]>('SELECT * FROM chat_messages WHERE msg_id = ?', [msgId]);
    if (!msgs[0]) return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    if (msgs[0].sender !== user.username) return NextResponse.json({ success: false, error: 'Not your message' }, { status: 403 });

    if (action === 'delete') {
      await query('UPDATE chat_messages SET is_deleted = 1, content = "This message was deleted" WHERE msg_id = ?', [msgId]);
      return NextResponse.json({ success: true });
    }
    if (action === 'edit' && content?.trim()) {
      await query('UPDATE chat_messages SET content = ?, is_edited = 1 WHERE msg_id = ?', [content.trim(), msgId]);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
