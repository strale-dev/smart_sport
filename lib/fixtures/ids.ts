export function parseProviderId(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const id = Number.parseInt(trimmed, 10);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export const parseFixtureId = parseProviderId;

export function daySectionAnchorId(dateKey: string): string {
  return `day-${dateKey}`;
}
