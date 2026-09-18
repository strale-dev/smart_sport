import type { FixtureStatus } from "@/types/domain";
import { isFinishedFixtureStatus, isLiveFixtureStatus } from "@/lib/redis/keys";

export type FixtureStatusTransitionLog = {
  scope: "live/fixture-lifecycle";
  fixtureProviderId: number;
  oldStatus: FixtureStatus | null;
  newStatus: FixtureStatus;
  score: string;
  source: string;
  timestamp: string;
  transition?: "LIVE_TO_FINISHED" | "STATUS_CHANGE";
};

export function logFixtureStatusTransition(
  input: Omit<
    FixtureStatusTransitionLog,
    "scope" | "transition" | "timestamp"
  > & {
    timestamp?: string;
  }
): void {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const wasLive =
    input.oldStatus != null && isLiveFixtureStatus(input.oldStatus);
  const isFinished = isFinishedFixtureStatus(input.newStatus);
  const transition =
    wasLive && isFinished
      ? ("LIVE_TO_FINISHED" as const)
      : input.oldStatus !== input.newStatus
        ? ("STATUS_CHANGE" as const)
        : undefined;

  if (!transition) {
    return;
  }

  console.info(
    JSON.stringify({
      scope: "live/fixture-lifecycle",
      level: "info",
      message: "fixture_status_transition",
      fixtureProviderId: input.fixtureProviderId,
      oldStatus: input.oldStatus,
      newStatus: input.newStatus,
      score: input.score,
      source: input.source,
      timestamp,
      transition,
    } satisfies FixtureStatusTransitionLog & {
      level: string;
      message: string;
    })
  );
}
