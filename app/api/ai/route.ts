import { NextRequest, NextResponse } from 'next/server';
import { AIModel } from '@/models/AIModel';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';
import { groqChatText, hasGroqConfig, inferGroqMode } from '@/lib/groq';

function normalizeMessage(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractDraftName(message: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return '';
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if ('response' in authResult) return authResult.response;

    const { message, sessionId, skipAI, isAssistant } = await request.json();
    const normalizedMessage = normalizeMessage(message);
    const userId = authResult.user.id;

    if (!normalizedMessage) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    let conversation;
    if (sessionId) {
      conversation = await AIModel.getConversationBySessionId(sessionId, userId);
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      const result = await AIModel.createConversation(userId);
      if (!result.success || !result.conversation) {
        return NextResponse.json(
          { success: false, error: 'Failed to create conversation' },
          { status: 500 }
        );
      }
      conversation = result.conversation;
    }

    await AIModel.saveMessage(
      conversation.id,
      userId,
      isAssistant ? 'assistant' : 'user',
      normalizedMessage
    );

    if (skipAI) {
      return NextResponse.json({
        success: true,
        sessionId: conversation.session_id,
        saved: true
      });
    }

    const history = await AIModel.getMessages(conversation.id);
    const lower = normalizedMessage.toLowerCase();

    if (lower.includes('buat task') || lower.includes('create task')) {
      const draftName = extractDraftName(normalizedMessage, [
        /(?:buat task|create task)\s+(.+)/i,
        /task baru[:\s]+(.+)/i
      ]);
      const responseText = draftName
        ? `Siap. Saya buka form task dengan judul awal "${draftName}". Tinggal lengkapi detailnya.`
        : 'Siap. Saya buka form task baru, lalu kamu bisa lengkapi detailnya.';

      await AIModel.saveMessage(conversation.id, userId, 'assistant', responseText);

      return NextResponse.json({
        success: true,
        response: responseText,
        action: { type: 'createTask', draftName },
        sessionId: conversation.session_id
      });
    }

    if (lower.includes('buat project') || lower.includes('create project')) {
      const draftName = extractDraftName(normalizedMessage, [
        /(?:buat project|create project)\s+(.+)/i,
        /project baru[:\s]+(.+)/i
      ]);
      const responseText = draftName
        ? `Siap. Saya buka form project dengan nama awal "${draftName}". Tinggal lengkapi ownership dan brief-nya.`
        : 'Siap. Saya buka form project baru, lalu kamu bisa lengkapi detailnya.';

      await AIModel.saveMessage(conversation.id, userId, 'assistant', responseText);

      return NextResponse.json({
        success: true,
        response: responseText,
        action: { type: 'createProject', draftName },
        sessionId: conversation.session_id
      });
    }

    if (!hasGroqConfig()) {
      const fallback = 'Integrasi AI belum dikonfigurasi. Tambahkan `GROQ_API_KEY` agar assistant bisa menjawab analisis dan insight.';
      await AIModel.saveMessage(conversation.id, userId, 'assistant', fallback);

      return NextResponse.json({
        success: true,
        response: fallback,
        action: null,
        sessionId: conversation.session_id
      });
    }

    const [dashboardResult, logsResult] = await Promise.all([
      fetch(`${request.nextUrl.origin}/api/dashboard`, {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store'
      }),
      fetch(`${request.nextUrl.origin}/api/logs`, {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store'
      })
    ]);

    const dashboardData = dashboardResult.ok ? await parseJsonSafe(dashboardResult) : null;
    const logsData = logsResult.ok ? await parseJsonSafe(logsResult) : null;

    const contextData = {
      projects: dashboardData?.success ? dashboardData.data.projects : [],
      tasks: dashboardData?.success ? dashboardData.data.tasks : [],
      stats: dashboardData?.success ? dashboardData.data.stats : {},
      logs: logsData?.success ? logsData.data.slice(0, 20) : [],
      user: authResult.user
    };

    const conversationContext = history
      .slice(-10)
      .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
      .join('\n');

    const smartContext = `
# SYSTEM CONTEXT - Raymaizing Task Management

## Current User
- Name: ${contextData.user.full_name}
- Username: ${contextData.user.username}
- Role: ${contextData.user.role}

## Current Statistics
- Total Projects: ${contextData.stats.totalProjects || 0}
- Active Tasks: ${contextData.stats.activeTasks || 0}
- Urgent Tasks: ${contextData.stats.urgent || 0}
- Overdue Tasks: ${contextData.stats.overdue || 0}
- Average Progress: ${contextData.stats.avgProgress || 0}%

## Active Projects (${contextData.projects.length})
${contextData.projects.slice(0, 10).map((project: any) =>
  `- ${project.project_id}: ${project.project_name} (${project.category}) - ${project.status} - Progress: ${project.progress}% - Owner: ${project.owner || 'None'} - Assignees: ${project.assignees || 'None'}`
).join('\n')}

## Active Tasks (${contextData.tasks.length})
${contextData.tasks.slice(0, 15).map((task: any) =>
  `- ${task.task_id}: ${task.task_name} (Project: ${task.project_id}) - Assignees: ${task.assignees || 'None'} - Status: ${task.status} - Priority: ${task.priority} - Progress: ${task.progress} - Due: ${task.due_date || 'No due date'}`
).join('\n')}

## Recent Changes (Last 20)
${contextData.logs.slice(0, 20).map((log: any) =>
  `- ${log.item_type} ${log.item_id}: ${log.change_type} changed from "${log.from_value}" to "${log.to_value}" by ${log.changed_by}`
).join('\n')}

## Previous Conversation
${conversationContext}
`;

    const mode = inferGroqMode(normalizedMessage);
    const { text } = await groqChatText({
      mode,
      messages: [
        {
          role: 'system',
          content: `${smartContext}

# YOUR ROLE
You are an AI Project Management Assistant for "Raymaizing Task". You have access to the actual task, project, log, and statistics context above.

# INSTRUCTIONS
- Use the actual data above when relevant.
- Reference project IDs, task IDs, names, dates, and numbers when possible.
- Respond in Indonesian.
- Be concise, practical, and actionable.
- Use markdown formatting when it improves readability.
- For numbered choices, use a proper markdown ordered list with each option on its own line: 1. ..., 2. ..., 3. .... Do not use keycap number emojis like 1️⃣, 2️⃣, or 3️⃣.
- If the user asks to create a task or project, suggest the next step clearly.
- For light discussion, be brief. For analysis, reason carefully and give concrete next actions.`
        },
        {
          role: 'user',
          content: normalizedMessage
        }
      ],
      temperature: mode === 'reasoning' ? 0.35 : 0.55,
      maxTokens: mode === 'reasoning' ? 1800 : 900
    });

    await AIModel.saveMessage(conversation.id, userId, 'assistant', text);

    if (history.length === 1) {
      await AIModel.autoGenerateName(conversation.id);
    }

    return NextResponse.json({
      success: true,
      response: text,
      action: null,
      sessionId: conversation.session_id
    });
  } catch (error: any) {
    logger.error('[AI API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI request failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if ('response' in authResult) return authResult.response;

    const userId = authResult.user.id;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const conversation = await AIModel.getConversationBySessionId(sessionId, userId);
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const messages = await AIModel.getMessages(conversation.id);
      return NextResponse.json({
        success: true,
        conversation,
        messages
      });
    }

    const conversations = await AIModel.getUserConversations(userId);
    return NextResponse.json({
      success: true,
      conversations
    });
  } catch (error: any) {
    logger.error('[AI API][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}
