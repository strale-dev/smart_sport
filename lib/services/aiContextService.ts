import { getAiPromptVersion } from "@/lib/env";
import { computeContextHash } from "@/lib/ai/hash";
import { sanitizeProviderText } from "@/lib/ai/sanitize";
import {
  buildDataAvailableManifest,
  buildDataCoverage,
  resolveDisplayDataQuality,
  compactLineupsForLiveContext,
  mapLineupsForContext,
  readTeamStandingsForFixture,
} from "@/lib/ai/context-helpers";
import {
  readFixtureByProviderIdFromDb,
  readFixtureSidelinedFromDb,
  readLineupsFromDb,
} from "@/lib/ingestion/db-read";
import {
  assertCompactContextWithinLimit,
  buildCompactPrematchAnalyticsContext,
  formSliceFromTeamFeatures,
} from "@/lib/analytics/compact-ai-context";
import { buildFixtureHistoryFeatures } from "@/lib/analytics/fixture-history-features";
import type { TeamHistoryFeatures } from "@/lib/analytics/history-feature-types";
import { resolveMatchFixtureContext } from "@/lib/match/fixture-context";
import { getH2H, getRecentForm } from "@/lib/services/analyticsService";
import type {
  HistoricalTeamContextSlice,
  LiveAiContext,
  PrematchAiContext,
  LineupsContextState,
  PrematchFormSlice,
} from "@/types/ai";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";
import { readLatestPrematchInsight } from "@/lib/ai/db";
import type { MeaningfulEventKind } from "@/lib/live/event-detector-types";
import {
  getActiveModelVersion,
  mapPredictionRowToResult,
  readOfficialPrematchPrediction,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import { cached } from "@/lib/redis/cache";

function resolveLineupsState(
  lineups: Awaited<ReturnType<typeof readLineupsFromDb>>
): LineupsContextState {
  if (lineups.length === 0) {
    return "MISSING";
  }

  if (lineups.every((lineup) => lineup.isConfirmed)) {
    return "CONFIRMED";
  }

  return "PREDICTED";
}

function metricValueOrNull(
  m: { status: string; value: number | null } | undefined
): number | null {
  if (!m || m.status !== "available") {
    return null;
  }
  return m.value;
}

function formSliceFromWindow(
  team: TeamHistoryFeatures,
  scope: "ALL" | "HOME" | "AWAY",
  window: 5 | 10 | 20
): PrematchFormSlice {
  const w = team.windows[scope]?.[window];
  if (!w || w.played === 0) {
    return null;
  }
  const ppg = w.ppg.status === "available" ? w.ppg.value : null;
  if (ppg === null) {
    return null;
  }
  const gf = w.goalsFor.value != null ? w.goalsFor.value * w.played : 0;
  const ga = w.goalsAgainst.value != null ? w.goalsAgainst.value * w.played : 0;
  return {
    wins: w.wins,
    draws: w.draws,
    losses: w.losses,
    ppg,
    goalsFor: Math.round(gf),
    goalsAgainst: Math.round(ga),
  };
}

function historicalContextFromFeatures(
  team: TeamHistoryFeatures
): HistoricalTeamContextSlice {
  const allScope = team.completenessByScope.find((c) => c.scope === "ALL");
  const w20 = team.windows.ALL?.[20];
  return {
    sampleSize: allScope?.validCount ?? 0,
    last20Ppg: metricValueOrNull(w20?.ppg),
    last10All: formSliceFromWindow(team, "ALL", 10),
    last10Home: formSliceFromWindow(team, "HOME", 10),
    last10Away: formSliceFromWindow(team, "AWAY", 10),
    seasonToDate: null,
    previousSeason: null,
    topCompetitions: [],
  };
}

function formSliceFromSnapshot(
  snapshot: Awaited<ReturnType<typeof getRecentForm>>
): PrematchAiContext["form"]["homeLast5"] {
  if (snapshot.results.length === 0 || snapshot.ppg == null) {
    return null;
  }
  return {
    wins: snapshot.wins,
    draws: snapshot.draws,
    losses: snapshot.losses,
    ppg: snapshot.ppg,
    goalsFor: snapshot.goalsFor,
    goalsAgainst: snapshot.goalsAgainst,
  };
}

export type PrematchContextResult = {
  context: PrematchAiContext;
  contextHash: string;
};

export async function buildPrematchContext(
  fixtureExternalId: number,
  prediction: PrematchPredictionResult
): Promise<PrematchContextResult> {
  const cacheKey = `cache:ai:prematch-ctx:${fixtureExternalId}:${prediction.predictionId}:${prediction.modelVersion}:${getAiPromptVersion()}`;
  const cachedResult = await cached({
    key: cacheKey,
    freshTtlSeconds: 120,
    staleTtlSeconds: 600,
    fn: () => buildPrematchContextUncached(fixtureExternalId, prediction),
  });
  return cachedResult.value;
}

async function buildPrematchContextUncached(
  fixtureExternalId: number,
  prediction: PrematchPredictionResult
): Promise<PrematchContextResult> {
  const fixture = await readFixtureByProviderIdFromDb(fixtureExternalId);
  if (!fixture) {
    throw new Error(`Fixture ${fixtureExternalId} not found for AI context`);
  }

  const matchCtx = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });

  const [historyFeatures, lineups, sidelined, standings] = await Promise.all([
    buildFixtureHistoryFeatures(fixtureExternalId, {
      asOf: fixture.kickoffAt,
    }),
    readLineupsFromDb(fixtureExternalId),
    readFixtureSidelinedFromDb(fixtureExternalId),
    matchCtx.supportsStandings
      ? readTeamStandingsForFixture({
          leagueExternalId: fixture.league.externalId,
          seasonYear: fixture.seasonYear,
          homeTeamExternalId: fixture.homeTeam.externalId,
          awayTeamExternalId: fixture.awayTeam.externalId,
        })
      : Promise.resolve({ home: null, away: null }),
  ]);

  if (!historyFeatures) {
    throw new Error(
      `Fixture ${fixtureExternalId} history features unavailable for AI context`
    );
  }

  const analyticsCompact =
    buildCompactPrematchAnalyticsContext(historyFeatures);
  assertCompactContextWithinLimit(analyticsCompact);

  const homeFormSlice = formSliceFromTeamFeatures(historyFeatures.home);
  const awayFormSlice = formSliceFromTeamFeatures(historyFeatures.away);
  const fixVenueSlice = (
    team: TeamHistoryFeatures,
    scope: "HOME" | "AWAY"
  ): PrematchAiContext["form"]["homeLast5Home"] => {
    const w = team.windows[scope]?.[5];
    if (
      !w ||
      w.played === 0 ||
      w.ppg.status !== "available" ||
      w.ppg.value == null
    ) {
      return null;
    }
    const gf =
      w.goalsFor.value != null ? Math.round(w.goalsFor.value * w.played) : 0;
    const ga =
      w.goalsAgainst.value != null
        ? Math.round(w.goalsAgainst.value * w.played)
        : 0;
    return {
      wins: w.wins,
      draws: w.draws,
      losses: w.losses,
      ppg: w.ppg.value,
      goalsFor: gf,
      goalsAgainst: ga,
    };
  };

  const h2h = historyFeatures.h2h;

  const lineupsState = resolveLineupsState(lineups);
  const promptVersion = getAiPromptVersion();
  const lineupsContext = mapLineupsForContext(lineups, lineupsState);
  const standingsContext =
    standings.home || standings.away
      ? { home: standings.home, away: standings.away }
      : null;
  const sidelinedContext =
    sidelined.length > 0
      ? sidelined.map((entry) => ({
          teamExternalId: entry.teamExternalId,
          playerExternalId: entry.playerExternalId,
          name: entry.name,
          kind: entry.kind,
          reason: entry.reason,
        }))
      : null;

  const hasFormAll = homeFormSlice != null && awayFormSlice != null;
  const hasFormHomeAway =
    fixVenueSlice(historyFeatures.home, "HOME") != null &&
    fixVenueSlice(historyFeatures.away, "AWAY") != null;
  const hasH2h = h2h.dataState === "available" && h2h.meetingsInWindow > 0;
  const hasStandings = standingsContext != null;
  const hasSidelined = sidelinedContext != null;

  const { dataMissing } = buildDataCoverage({
    supportsStandings: matchCtx.supportsStandings,
    hasStandings,
    hasFormAll,
    hasFormHomeAway,
    hasH2h,
    lineupsState,
    hasSidelined,
  });

  const dataAvailableForContext = buildDataAvailableManifest({
    supportsStandings: matchCtx.supportsStandings,
    hasStandings,
    hasFormAll,
    hasFormHomeAway,
    hasH2h,
    lineupsState,
    hasSidelined,
    hasReferee: fixture.referee != null && fixture.referee.length > 0,
    hasRound: fixture.round != null && fixture.round.length > 0,
    hasVenue: fixture.venue?.name != null,
    modelPrediction: true,
  });

  const context: PrematchAiContext = {
    fixtureExternalId,
    kickoffAt: fixture.kickoffAt,
    status: fixture.status,
    venue: sanitizeProviderText(fixture.venue?.name ?? null),
    league: {
      externalId: fixture.league.externalId,
      name: sanitizeProviderText(fixture.league.name) ?? "Unknown league",
      category: matchCtx.category,
      tier: matchCtx.tier,
      isInternational: matchCtx.isInternational,
      supportsStandings: matchCtx.supportsStandings,
    },
    homeTeam: {
      externalId: fixture.homeTeam.externalId,
      name: sanitizeProviderText(fixture.homeTeam.name) ?? "Home team",
      isNational: fixture.homeTeam.isNational,
    },
    awayTeam: {
      externalId: fixture.awayTeam.externalId,
      name: sanitizeProviderText(fixture.awayTeam.name) ?? "Away team",
      isNational: fixture.awayTeam.isNational,
    },
    lineupsState,
    round: sanitizeProviderText(fixture.round),
    referee: sanitizeProviderText(fixture.referee),
    modelVersion: prediction.modelVersion,
    promptVersion,
    prediction: {
      winProbabilities: prediction.winProbabilities,
      expectedGoalsHome: prediction.expectedGoalsHome,
      expectedGoalsAway: prediction.expectedGoalsAway,
      expectedGoalsTotalMin: prediction.expectedGoalsTotalMin,
      expectedGoalsTotalMax: prediction.expectedGoalsTotalMax,
      bttsProb: prediction.bttsProb,
      weakerTeamScoringProb: prediction.weakerTeamScoringProb,
      confidence: prediction.confidence,
      predictedOutcome: prediction.predictedOutcome,
      dataQuality: prediction.inputSnapshot.dataQuality,
    },
    form: {
      homeLast5: homeFormSlice,
      awayLast5: awayFormSlice,
      homeLast5Home: fixVenueSlice(historyFeatures.home, "HOME"),
      awayLast5Away: fixVenueSlice(historyFeatures.away, "AWAY"),
    },
    analyticsCompact,
    standings: standingsContext,
    lineups: lineupsContext,
    sidelined: sidelinedContext,
    dataAvailable: dataAvailableForContext,
    dataMissing,
    h2h: hasH2h
      ? {
          meetings: h2h.meetingsInWindow,
          homeWins: h2h.homeWins,
          draws: h2h.draws,
          awayWins: h2h.awayWins,
          avgGoals: metricValueOrNull(h2h.avgGoalsSimple),
        }
      : null,
    historicalContext: {
      home: historicalContextFromFeatures(historyFeatures.home),
      away: historicalContextFromFeatures(historyFeatures.away),
    },
    predictionFeatures: {
      homeXgForAvg: prediction.inputSnapshot.homeXgForAvg,
      awayXgForAvg: prediction.inputSnapshot.awayXgForAvg,
      homeXgAgainstAvg: prediction.inputSnapshot.homeXgAgainstAvg,
      awayXgAgainstAvg: prediction.inputSnapshot.awayXgAgainstAvg,
      homeRestDays: prediction.inputSnapshot.homeRestDays,
      awayRestDays: prediction.inputSnapshot.awayRestDays,
      homeInjuryImpact: prediction.inputSnapshot.homeInjuryImpact,
      awayInjuryImpact: prediction.inputSnapshot.awayInjuryImpact,
      homeTopScorersSidelined: prediction.inputSnapshot.homeTopScorersSidelined,
      awayTopScorersSidelined: prediction.inputSnapshot.awayTopScorersSidelined,
      leaguePositionDiff: prediction.inputSnapshot.leaguePositionDiff,
      standingPointsDiff: prediction.inputSnapshot.standingPointsDiff,
    },
    dataQuality: resolveDisplayDataQuality({
      dataMissing,
      predictionDataQuality: prediction.inputSnapshot.dataQuality,
    }),
    dataTimestamp: new Date().toISOString(),
  };

  const contextHash = computeContextHash({
    fixtureExternalId,
    modelVersion: context.modelVersion,
    promptVersion: context.promptVersion,
    lineupsState: context.lineupsState,
    kickoffAt: context.kickoffAt,
    status: context.status,
    league: context.league,
    homeTeam: {
      externalId: context.homeTeam.externalId,
      isNational: context.homeTeam.isNational,
    },
    awayTeam: {
      externalId: context.awayTeam.externalId,
      isNational: context.awayTeam.isNational,
    },
    prediction: context.prediction,
    form: context.form,
    h2h: context.h2h,
    standings: context.standings,
    lineups: context.lineups,
    sidelined: context.sidelined,
    dataAvailable: context.dataAvailable,
    dataMissing: context.dataMissing,
    analyticsCompact: context.analyticsCompact,
    referee: context.referee,
    round: context.round,
    historicalContext: context.historicalContext,
    predictionFeatures: context.predictionFeatures,
  });

  return { context, contextHash };
}

export function buildPrematchUserPrompt(context: PrematchAiContext): string {
  return JSON.stringify(context, null, 2);
}

export type LiveContextResult = {
  context: LiveAiContext;
  contextHash: string;
};

async function resolvePrematchReferenceForLive(
  fixtureExternalId: number,
  kickoffAt: string
): Promise<LiveAiContext["prematchReference"]> {
  const fixtureRow = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixtureRow) {
    return null;
  }

  const kickoffReached = Date.now() >= new Date(kickoffAt).getTime();
  const prematchRow = kickoffReached
    ? ((await readOfficialPrematchPrediction(fixtureRow.id, kickoffAt)) ??
      (await readLatestPrematchPrediction(fixtureRow.id)))
    : await readLatestPrematchPrediction(fixtureRow.id);

  if (!prematchRow) {
    return null;
  }

  const modelVersion = await getActiveModelVersion();
  const prematchResult = mapPredictionRowToResult(
    prematchRow,
    fixtureExternalId,
    modelVersion.version,
    true
  );

  const prematchInsight = await readLatestPrematchInsight(fixtureRow.id);
  const summary = prematchInsight?.summary?.trim() || null;

  return {
    winProbabilities: prematchResult.winProbabilities,
    predictedOutcome: prematchResult.predictedOutcome,
    summary,
  };
}

export async function buildLiveContext(input: {
  fixtureExternalId: number;
  prediction: LivePredictionResult;
  meaningfulTriggers: MeaningfulEventKind[];
  minute: number | null;
  score: { home: number | null; away: number | null };
  liveStats: LiveAiContext["liveStats"];
}): Promise<LiveContextResult> {
  const fixture = await readFixtureByProviderIdFromDb(input.fixtureExternalId);
  if (!fixture) {
    throw new Error(
      `Fixture ${input.fixtureExternalId} not found for live AI context`
    );
  }

  const matchCtx = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });

  const [
    homeForm,
    awayForm,
    h2h,
    lineups,
    sidelined,
    standings,
    prematchReference,
  ] = await Promise.all([
    getRecentForm(fixture.homeTeam.externalId, { matches: 5, scope: "ALL" }),
    getRecentForm(fixture.awayTeam.externalId, { matches: 5, scope: "ALL" }),
    getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "ALL",
      leagueProviderId: fixture.league.externalId,
    }),
    readLineupsFromDb(input.fixtureExternalId),
    readFixtureSidelinedFromDb(input.fixtureExternalId),
    matchCtx.supportsStandings
      ? readTeamStandingsForFixture({
          leagueExternalId: fixture.league.externalId,
          seasonYear: fixture.seasonYear,
          homeTeamExternalId: fixture.homeTeam.externalId,
          awayTeamExternalId: fixture.awayTeam.externalId,
        })
      : Promise.resolve({ home: null, away: null }),
    resolvePrematchReferenceForLive(input.fixtureExternalId, fixture.kickoffAt),
  ]);

  const lineupsState = resolveLineupsState(lineups);
  const promptVersion = getAiPromptVersion();
  const lineupsContext = compactLineupsForLiveContext(
    mapLineupsForContext(lineups, lineupsState)
  );
  const standingsContext =
    standings.home || standings.away
      ? { home: standings.home, away: standings.away }
      : null;
  const sidelinedContext =
    sidelined.length > 0
      ? sidelined.map((entry) => ({
          teamExternalId: entry.teamExternalId,
          playerExternalId: entry.playerExternalId,
          name: entry.name,
          kind: entry.kind,
          reason: entry.reason,
        }))
      : null;

  const hasLiveMatchStats =
    input.liveStats.xgHome != null ||
    input.liveStats.xgAway != null ||
    input.liveStats.redCardsHome > 0 ||
    input.liveStats.redCardsAway > 0 ||
    input.liveStats.shotsTotalHome != null ||
    input.liveStats.shotsTotalAway != null ||
    input.liveStats.shotsOnTargetHome != null ||
    input.liveStats.shotsOnTargetAway != null ||
    input.liveStats.ballPossessionHome != null ||
    input.liveStats.ballPossessionAway != null;

  const liveHasFormAll =
    homeForm.results.length > 0 && awayForm.results.length > 0;
  const liveHasH2h = h2h.meetings.length > 0;
  const liveHasStandings = standingsContext != null;
  const liveHasSidelined = sidelinedContext != null;

  const { dataMissing: liveDataMissing } = buildDataCoverage({
    supportsStandings: matchCtx.supportsStandings,
    hasStandings: liveHasStandings,
    hasFormAll: liveHasFormAll,
    hasFormHomeAway: false,
    hasH2h: liveHasH2h,
    lineupsState,
    hasSidelined: liveHasSidelined,
  });

  const dataAvailable = buildDataAvailableManifest({
    supportsStandings: matchCtx.supportsStandings,
    hasStandings: liveHasStandings,
    hasFormAll: liveHasFormAll,
    hasFormHomeAway: false,
    hasH2h: liveHasH2h,
    lineupsState,
    hasSidelined: liveHasSidelined,
    hasReferee: fixture.referee != null && fixture.referee.length > 0,
    hasRound: fixture.round != null && fixture.round.length > 0,
    hasVenue: fixture.venue?.name != null,
    modelPrediction: true,
    hasLiveMatchStats,
  });

  const context: LiveAiContext = {
    fixtureExternalId: input.fixtureExternalId,
    kickoffAt: fixture.kickoffAt,
    status: fixture.status,
    minute: input.minute,
    score: input.score,
    venue: sanitizeProviderText(fixture.venue?.name ?? null),
    league: {
      externalId: fixture.league.externalId,
      name: sanitizeProviderText(fixture.league.name) ?? "Unknown league",
      category: matchCtx.category,
      tier: matchCtx.tier,
      isInternational: matchCtx.isInternational,
      supportsStandings: matchCtx.supportsStandings,
    },
    homeTeam: {
      externalId: fixture.homeTeam.externalId,
      name: sanitizeProviderText(fixture.homeTeam.name) ?? "Home team",
      isNational: fixture.homeTeam.isNational,
    },
    awayTeam: {
      externalId: fixture.awayTeam.externalId,
      name: sanitizeProviderText(fixture.awayTeam.name) ?? "Away team",
      isNational: fixture.awayTeam.isNational,
    },
    lineupsState,
    round: sanitizeProviderText(fixture.round),
    referee: sanitizeProviderText(fixture.referee),
    modelVersion: input.prediction.modelVersion,
    promptVersion,
    meaningfulTriggers: [...input.meaningfulTriggers].sort(),
    prediction: {
      winProbabilities: input.prediction.winProbabilities,
      expectedGoalsHome: input.prediction.expectedGoalsHome,
      expectedGoalsAway: input.prediction.expectedGoalsAway,
      expectedGoalsTotalMin: input.prediction.expectedGoalsTotalMin,
      expectedGoalsTotalMax: input.prediction.expectedGoalsTotalMax,
      bttsProb: input.prediction.bttsProb,
      weakerTeamScoringProb: input.prediction.weakerTeamScoringProb,
      confidence: input.prediction.confidence,
      predictedOutcome: input.prediction.predictedOutcome,
      dataQuality: input.prediction.inputSnapshot.dataQuality,
    },
    form: {
      homeLast5: formSliceFromSnapshot(homeForm),
      awayLast5: formSliceFromSnapshot(awayForm),
      homeLast5Home: null,
      awayLast5Away: null,
    },
    standings: standingsContext,
    lineups: lineupsContext,
    sidelined: sidelinedContext,
    dataAvailable,
    dataMissing: liveDataMissing,
    h2h:
      h2h.meetings.length > 0
        ? {
            meetings: h2h.meetings.length,
            homeWins: h2h.teamAWins,
            draws: h2h.draws,
            awayWins: h2h.teamBWins,
            avgGoals:
              h2h.meetings.length > 0
                ? Number(
                    (
                      (h2h.teamAGoals + h2h.teamBGoals) /
                      h2h.meetings.length
                    ).toFixed(2)
                  )
                : null,
          }
        : null,
    liveStats: input.liveStats,
    prematchReference,
    dataQuality: resolveDisplayDataQuality({
      dataMissing: liveDataMissing,
      predictionDataQuality: input.prediction.inputSnapshot.dataQuality,
    }),
    dataTimestamp: new Date().toISOString(),
  };

  const contextHash = computeContextHash({
    fixtureExternalId: input.fixtureExternalId,
    modelVersion: context.modelVersion,
    promptVersion: context.promptVersion,
    minute: context.minute,
    score: context.score,
    league: context.league,
    homeTeam: {
      externalId: context.homeTeam.externalId,
      isNational: context.homeTeam.isNational,
    },
    awayTeam: {
      externalId: context.awayTeam.externalId,
      isNational: context.awayTeam.isNational,
    },
    meaningfulTriggers: context.meaningfulTriggers,
    prediction: context.prediction,
    liveStats: context.liveStats,
    prematchReference: context.prematchReference,
    lineupsState: context.lineupsState,
    sidelined: context.sidelined,
    form: context.form,
    standings: context.standings,
    lineups: context.lineups,
    h2h: context.h2h,
    dataAvailable: context.dataAvailable,
    dataMissing: context.dataMissing,
    referee: context.referee,
    round: context.round,
  });

  return { context, contextHash };
}

export function buildLiveUserPrompt(context: LiveAiContext): string {
  return JSON.stringify(context, null, 2);
}
