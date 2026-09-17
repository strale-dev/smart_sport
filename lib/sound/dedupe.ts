const GOAL_KEY_TTL_MS = 60_000;
const MIN_INTERVAL_MS = 1_500;

type DedupeState = {
  recentKeys: Map<string, number>;
  lastPlayedAt: Partial<Record<"goal" | "fullTime", number>>;
};

const state: DedupeState = {
  recentKeys: new Map(),
  lastPlayedAt: {},
};

function pruneRecentKeys(now: number): void {
  for (const [key, expiresAt] of state.recentKeys) {
    if (expiresAt <= now) {
      state.recentKeys.delete(key);
    }
  }
}

/** Returns true if playback should proceed; false if deduped. */
export function shouldPlaySound(
  kind: "goal" | "fullTime",
  dedupeKey: string,
  now: number = Date.now()
): boolean {
  pruneRecentKeys(now);

  const keyExpires = state.recentKeys.get(dedupeKey);
  if (keyExpires != null && keyExpires > now) {
    return false;
  }

  const lastKind = state.lastPlayedAt[kind];
  if (lastKind != null && now - lastKind < MIN_INTERVAL_MS) {
    return false;
  }

  return true;
}

export function markSoundPlayed(
  kind: "goal" | "fullTime",
  dedupeKey: string,
  now: number = Date.now()
): void {
  state.recentKeys.set(dedupeKey, now + GOAL_KEY_TTL_MS);
  state.lastPlayedAt[kind] = now;
}

export function resetSoundDedupeForTests(): void {
  state.recentKeys.clear();
  state.lastPlayedAt = {};
}
