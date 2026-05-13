export type GroqMode = 'fast' | 'reasoning';

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GroqChatOptions = {
  messages: GroqMessage[];
  mode?: GroqMode;
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_FAST_MODEL = 'openai/gpt-oss-20b';
const LEGACY_FAST_MODELS = new Set(['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);

function normalizeFastModel(model: string | undefined) {
  const trimmed = model?.trim();
  if (!trimmed || LEGACY_FAST_MODELS.has(trimmed)) return DEFAULT_FAST_MODEL;
  return trimmed;
}

export const GROQ_FAST_MODEL =
  normalizeFastModel(process.env.GROQ_FAST_MODEL);

export const GROQ_REASONING_MODEL =
  process.env.GROQ_REASONING_MODEL || 'openai/gpt-oss-20b';

export function hasGroqConfig() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function inferGroqMode(message: string, options?: { hasActions?: boolean }): GroqMode {
  if (options?.hasActions) return 'reasoning';

  const text = message.toLowerCase();
  const needsReasoning = [
    'analisis',
    'analyze',
    'beban',
    'risiko',
    'risk',
    'prioritas',
    'priority',
    'rencana',
    'strategy',
    'strategi',
    'eksekusi',
    'execute',
    'buat task',
    'create task',
    'buat project',
    'create project',
    'update task',
    'ringkas progress',
    'summary progress',
    'deadline',
    'workload',
    'kenapa',
    'bagaimana',
  ].some((keyword) => text.includes(keyword));

  return needsReasoning ? 'reasoning' : 'fast';
}

function isGroqModel(model: string) {
  return (
    model.startsWith('openai/') ||
    model.startsWith('llama-') ||
    model.startsWith('meta-llama/') ||
    model.startsWith('qwen/') ||
    model.startsWith('moonshotai/') ||
    model.startsWith('groq/')
  );
}

function resolveGroqModel(requestedModel: string | null | undefined, mode: GroqMode) {
  const model = requestedModel?.trim();

  if (mode === 'reasoning') {
    if (model?.startsWith('openai/gpt-oss')) return model;
    return GROQ_REASONING_MODEL;
  }

  if (model && LEGACY_FAST_MODELS.has(model)) {
    return GROQ_FAST_MODEL;
  }

  if (model && isGroqModel(model) && !model.startsWith('openai/gpt-oss')) {
    return model;
  }

  if (model && /pro|gpt-4o|reason/i.test(model)) {
    return GROQ_REASONING_MODEL;
  }

  return GROQ_FAST_MODEL;
}

async function callGroq(
  model: string,
  messages: GroqMessage[],
  temperature: number,
  maxTokens: number
) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq ${model} failed with status ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Groq ${model} returned an empty response`);
  }

  return text.trim();
}

export async function groqChatText(options: GroqChatOptions) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const mode = options.mode || 'fast';
  const primaryModel = resolveGroqModel(options.model, mode);
  const fallbackModel = mode === 'reasoning' ? GROQ_FAST_MODEL : GROQ_REASONING_MODEL;
  const temperature = options.temperature ?? (mode === 'reasoning' ? 0.35 : 0.55);
  const maxTokens = options.maxTokens ?? (mode === 'reasoning' ? 1800 : 1000);

  try {
    const text = await callGroq(primaryModel, options.messages, temperature, maxTokens);
    return { text, model: primaryModel, fallbackUsed: false };
  } catch (primaryError) {
    if (fallbackModel === primaryModel) throw primaryError;

    const text = await callGroq(fallbackModel, options.messages, temperature, maxTokens);
    return { text, model: fallbackModel, fallbackUsed: true };
  }
}
