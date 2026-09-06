const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;
const WHITESPACE_PATTERN = /\s+/g;

export function sanitizeProviderText(
  value: string | null | undefined,
  maxLen = 120
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value
    .replace(CONTROL_CHAR_PATTERN, "")
    .trim()
    .replace(WHITESPACE_PATTERN, " ");

  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLen) {
    return normalized;
  }

  return normalized.slice(0, maxLen).trimEnd();
}
