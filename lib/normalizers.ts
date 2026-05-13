export function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeCsvList(value?: string | null) {
  if (!value) return null;

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const uniqueItems = Array.from(new Set(items));
  return uniqueItems.length > 0 ? uniqueItems.join(', ') : null;
}

export function replaceInCsvList(value: string | null | undefined, from: string, to: string) {
  if (!value) return null;

  const fromValue = from.trim().toLowerCase();
  const nextValue = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.toLowerCase() === fromValue ? to.trim() : item));

  return normalizeCsvList(nextValue.join(', '));
}

export function firstCsvItem(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) || null;
}

export function normalizeOptionalDate(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
