import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import type {
  LiveFeatureVector,
  PredictionDataQuality,
  WinProbabilities,
} from "@/types/prediction";

function findTeamStat(snapshot: LiveDetectorSnapshot, teamExternalId: number) {
  return snapshot.stats.find(
    (entry) => entry.teamExternalId === teamExternalId
  );
}

export function buildLiveFeaturesFromSnapshot(
  snapshot: LiveDetectorSnapshot,
  anchorWinProbabilities: WinProbabilities
): LiveFeatureVector {
  const homeStats = findTeamStat(snapshot, snapshot.homeTeamExternalId);
  const awayStats = findTeamStat(snapshot, snapshot.awayTeamExternalId);

  const hasXg =
    homeStats?.expectedGoals != null || awayStats?.expectedGoals != null;

  const dataQuality: PredictionDataQuality =
    homeStats && awayStats ? (hasXg ? "COMPLETE" : "PARTIAL") : "PARTIAL";

  return {
    fixtureExternalId: snapshot.fixtureProviderId,
    asOf: snapshot.capturedAt,
    minute: snapshot.minute,
    scoreHome: snapshot.score.home ?? 0,
    scoreAway: snapshot.score.away ?? 0,
    redCardsHome: homeStats?.redCards ?? 0,
    redCardsAway: awayStats?.redCards ?? 0,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    xgHome: homeStats?.expectedGoals ?? null,
    xgAway: awayStats?.expectedGoals ?? null,
    possessionHome: null,
    possessionAway: null,
    cornersHome: null,
    cornersAway: null,
    anchorWinProbabilities,
    priorWinProbabilities: anchorWinProbabilities,
    dataQuality,
  };
}
