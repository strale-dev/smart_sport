import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";

export type { MeaningfulEventBroadcastPayload };

export const LIVE_FEED_CHANNEL = "live:feed";

export const LIVE_BROADCAST_EVENT = "update";

export function matchChannel(fixtureProviderId: number): string {
  return `match:${fixtureProviderId}`;
}

export type LiveBroadcastPayload = {
  fixtureProviderId?: number;
  syncedAt: string;
  source: "match" | "live-center";
  meaningfulEvents?: MeaningfulEventBroadcastPayload[];
  /** Full authoritative match state (match channel only). */
  snapshot?: MatchLiveSnapshot;
  /** Live narrative was stored on a tick that did not change the score snapshot. */
  liveInsightGenerated?: boolean;
};
