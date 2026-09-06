import { getAiPromptVersion } from "@/lib/env";
import { computeContextHash } from "@/lib/ai/hash";
import {
  readFixtureByProviderIdFromDb,
  readLineupsFromDb,
} from "@/lib/ingestion/db-read";
import { getH2H, getRecentForm } from "@/lib/services/analyticsService";
import type { PrematchAiContext, LineupsContextState } from "@/types/ai";
import type { PrematchPredictionResult } from "@/types/prediction";

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

function resolveContextDataQuality(input: {
  lineupsState: LineupsContextState;
  hasForm: boolean;
  hasH2h: boolean;
  predictionDataQuality: "COMPLETE" | "PARTIAL";
}): PrematchAiContext["dataQuality"] {
  if (input.predictionDataQuality === "PARTIAL") {
    return "PARTIAL";
  }

  if (input.lineupsState === "CONFIRMED" && input.hasForm && input.hasH2h) {
    return "COMPLETE";
  }

  if (input.lineupsState === "MISSING" || !input.hasForm) {
    return "PARTIAL";
  }

  return "PARTIAL";
}

export type PrematchContextResult = {
  context: PrematchAiContext;
  contextHash: string;
};

export async function buildPrematchContext(
  fixtureExternalId: number,
  prediction: PrematchPredictionResult
): Promise<PrematchContextResult> {
  const fixture = await readFixtureByProviderIdFromDb(fixtureExternalId);
  if (!fixture) {
    throw new Error(`Fixture ${fixtureExternalId} not found for AI context`);
  }

  const [homeForm, awayForm, h2h, lineups] = await Promise.all([
    getRecentForm(fixture.homeTeam.externalId, { matches: 5, scope: "ALL" }),
    getRecentForm(fixture.awayTeam.externalId, { matches: 5, scope: "ALL" }),
    getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "ALL",
      leagueProviderId: fixture.league.externalId,
    }),
    readLineupsFromDb(fixtureExternalId),
  ]);

  const lineupsState = resolveLineupsState(lineups);
  const promptVersion = getAiPromptVersion();

  const context: PrematchAiContext = {
    fixtureExternalId,
    kickoffAt: fixture.kickoffAt,
    status: fixture.status,
    venue: fixture.venue?.name ?? null,
    league: {
      externalId: fixture.league.externalId,
      name: fixture.league.name,
    },
    homeTeam: {
      externalId: fixture.homeTeam.externalId,
      name: fixture.homeTeam.name,
    },
    awayTeam: {
      externalId: fixture.awayTeam.externalId,
      name: fixture.awayTeam.name,
    },
    lineupsState,
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
      homeLast5: {
        wins: homeForm.wins,
        draws: homeForm.draws,
        losses: homeForm.losses,
        ppg: homeForm.ppg ?? 0,
        goalsFor: homeForm.goalsFor,
        goalsAgainst: homeForm.goalsAgainst,
      },
      awayLast5: {
        wins: awayForm.wins,
        draws: awayForm.draws,
        losses: awayForm.losses,
        ppg: awayForm.ppg ?? 0,
        goalsFor: awayForm.goalsFor,
        goalsAgainst: awayForm.goalsAgainst,
      },
    },
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
    dataQuality: resolveContextDataQuality({
      lineupsState,
      hasForm: homeForm.results.length > 0 && awayForm.results.length > 0,
      hasH2h: h2h.meetings.length > 0,
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
    prediction: context.prediction,
    form: context.form,
    h2h: context.h2h,
  });

  return { context, contextHash };
}

export function buildPrematchUserPrompt(context: PrematchAiContext): string {
  return JSON.stringify(context, null, 2);
}
