/** Pure env string normalization — safe for Edge and browser bundles. */
export function normalizeEnvValue(value: string): string {
  const trimmed = value.trim().replace(/\r$/, "");

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
