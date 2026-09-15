import type { AuthoritativeLiveState } from "@/lib/live/authoritative-fingerprint";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";

export function buildMatchLiveSnapshot(
  state: AuthoritativeLiveState
): MatchLiveSnapshot {
  return {
    fixture: state.fixture,
    events: state.events,
    statistics: state.statistics,
  };
}
