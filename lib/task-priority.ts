const CANONICAL_TASK_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent', 'Recurring'] as const;

const LEGACY_PRIORITY_ALIASES: Record<string, (typeof CANONICAL_TASK_PRIORITIES)[number]> = {
  p0: 'Urgent',
  po: 'Urgent',
  p1: 'High',
  p2: 'Normal',
  p3: 'Low',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  recurring: 'Recurring'
};

export type CanonicalTaskPriority = (typeof CANONICAL_TASK_PRIORITIES)[number];

export function getCanonicalTaskPriorities() {
  return [...CANONICAL_TASK_PRIORITIES];
}

export function isCanonicalTaskPriority(value?: string | null): value is CanonicalTaskPriority {
  if (!value) return false;
  return CANONICAL_TASK_PRIORITIES.includes(value.trim() as CanonicalTaskPriority);
}

export function normalizeTaskPriority(
  value?: string | null,
  fallback: CanonicalTaskPriority = 'Normal'
) {
  const normalized = value?.trim();
  if (!normalized) return fallback;

  if (isCanonicalTaskPriority(normalized)) {
    return normalized;
  }

  return LEGACY_PRIORITY_ALIASES[normalized.toLowerCase()] || fallback;
}

export function getLegacyTaskPriorityMappings() {
  return { ...LEGACY_PRIORITY_ALIASES };
}
