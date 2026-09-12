export const AI_UPDATED_MARKER_FRESH_MS = 5 * 60 * 1000;

export function isAiUpdatedMarkerFresh(
  aiUpdatedAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!aiUpdatedAt) {
    return false;
  }

  return (
    now.getTime() - new Date(aiUpdatedAt).getTime() <=
    AI_UPDATED_MARKER_FRESH_MS
  );
}
