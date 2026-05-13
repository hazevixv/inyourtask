import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { groqChatText, hasGroqConfig } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if ('response' in authResult) return authResult.response;

    const { action, field, value, context } = await request.json();

    if (!hasGroqConfig()) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    let prompt = '';

    if (action === 'enhance') {
      // AI Enhance - improve existing content or generate from title
      if (!value || value.trim() === '') {
        // Generate from context (title)
        prompt = generateFromTitlePrompt(field, context);
      } else {
        // Enhance existing content
        prompt = enhanceContentPrompt(field, value, context);
      }
    } else if (action === 'autofill') {
      // AI Auto Fill - fill all fields based on title
      prompt = autofillPrompt(context);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const { text } = await groqChatText({
      mode: action === 'autofill' ? 'reasoning' : 'fast',
      messages: [
        {
          role: 'system',
          content: 'You help complete task/project fields for Raymaizing Task. Respond in Indonesian. Follow the requested output format exactly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.35,
      maxTokens: action === 'autofill' ? 1200 : 700
    });

    if (action === 'autofill') {
      // Parse JSON response for autofill
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        const result = JSON.parse(jsonText);
        
        return NextResponse.json({
          success: true,
          result
        });
      } catch (parseError) {
        logger.error('[AI Enhance] JSON parse error:', parseError);
        return NextResponse.json(
          { success: false, error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    } else {
      // Return enhanced text
      return NextResponse.json({
        success: true,
        result: text.trim()
      });
    }
  } catch (error: any) {
    logger.error('[AI Enhance] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI enhancement failed' },
      { status: 500 }
    );
  }
}

function generateFromTitlePrompt(field: string, context: any): string {
  const { type, title } = context;
  
  // Shorter, more focused prompts to save tokens
  const prompts: Record<string, string> = {
    notes: `Task: ${title}\nWrite 2-3 concise sentences in Indonesian about context, blockers, or important details.`,
    brief: `Task: ${title}\nWrite a brief in Indonesian with:\n1. Main objective (1 sentence)\n2. Key requirements (2-3 points)\n3. Expected outcome (1 sentence)\nKeep it under 150 words.`,
    url: `Task: ${title}\nSuggest 2 relevant URLs (documentation or tools). Format: one URL per line.`,
    category: `Project: ${title}\nSuggest ONE category: Development, Design, Marketing, or Infrastructure.`,
    status: `Suggest initial status: Planning, Active, On Hold, or Closed.`,
    priority: `Suggest priority: Low, Normal, High, or Urgent.`,
  };

  return prompts[field] || `Generate ${field} for: ${title}`;
}

function enhanceContentPrompt(field: string, currentValue: string, context: any): string {
  const { type, title } = context;
  
  // Limit enhancement to avoid token waste
  const wordCount = currentValue.split(/\s+/).length;
  const maxWords = wordCount < 50 ? 150 : 250;

  return `Task: ${title}
Current ${field}:
"${currentValue}"

Improve this in Indonesian:
- Make it clearer and more structured
- Add missing details
- Keep under ${maxWords} words
- No markdown formatting

Enhanced version:`;
}

function autofillPrompt(context: any): string {
  const { type, title } = context;

  if (type === 'task') {
    return `Task: "${title}"

Generate JSON with these fields (in Indonesian, concise):
{
  "notes": "2-3 sentences about context",
  "brief": "Brief with objective, requirements, outcome (max 150 words)",
  "url": "2 relevant URLs (one per line)",
  "status": "Backlog|To Do|In Progress|In Review|Done",
  "priority": "Low|Normal|High|Urgent",
  "progress": "0%|25%|50%|75%|100%"
}

Return ONLY valid JSON, no markdown.`;
  } else {
    return `Project: "${title}"

Generate JSON with these fields (in Indonesian, concise):
{
  "notes": "2-3 sentences about context",
  "brief": "Brief with objectives and outcomes (max 150 words)",
  "url": "2 relevant URLs (one per line)",
  "category": "Development|Design|Marketing|Infrastructure",
  "status": "Planning|Active|On Hold|Closed"
}

Return ONLY valid JSON, no markdown.`;
  }
}
