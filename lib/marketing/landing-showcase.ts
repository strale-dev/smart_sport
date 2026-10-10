import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import { readFixturesForDateFromDb } from "@/lib/ingestion/db-read";
import {
  mapPrematchPredictionRowForFixture,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import { maxWinProbability } from "@/lib/models/confidence";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import type { Fixture } from "@/types/domain";
import type { AiConfidence } from "@/types/prediction";

export type LandingShowcaseData = {
  fixture: Fixture;
  winProbabilities: { home: number; draw: number; away: number } | null;
  predictedOutcome: "1" | "X" | "2" | null;
  confidence: AiConfidence | null;
  modelProbability: number | null;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyContext(now: Date): ImportanceContext {
  return {
    now,
    prestigeByLeagueId: new Map(),
    standingsByFixtureId: new Map(),
    h2hInterestByFixtureId: new Map(),
    preferredLeagueExternalId: null,
  };
}

export async function loadLandingShowcaseFixture(): Promise<LandingShowcaseData | null> {
  const now = new Date();
  const today = utcToday();
  const fixtures = await readFixturesForDateFromDb(today);
  const upcoming = fixtures.filter(
    (fixture) => fixture.status === "NS" || fixture.status === "TBD"
  );

  if (upcoming.length === 0) {
    return null;
  }

  const ranked = rankFixturesByImportance(upcoming, emptyContext(now));
  const fixture = ranked[0]?.fixture ?? upcoming[0];
  if (!fixture) {
    return null;
  }

  const fixtureRow = await resolveFixtureUuidByExternalId(fixture.externalId);
  if (!fixtureRow) {
    return {
      fixture,
      winProbabilities: null,
      predictedOutcome: null,
      confidence: null,
      modelProbability: null,
    };
  }

  const row = await readLatestPrematchPrediction(fixtureRow.id);
  if (!row) {
    return {
      fixture,
      winProbabilities: null,
      predictedOutcome: null,
      confidence: null,
      modelProbability: null,
    };
  }

  const mapped = await mapPrematchPredictionRowForFixture(
    row,
    fixture.externalId,
    "1.0.0",
    true
  );
  if (!mapped) {
    return {
      fixture,
      winProbabilities: null,
      predictedOutcome: null,
      confidence: null,
      modelProbability: null,
    };
  }
  const modelProbability = maxWinProbability(mapped.winProbabilities);

  return {
    fixture,
    winProbabilities: mapped.winProbabilities,
    predictedOutcome: predictedOutcomeFromProbabilities(
      mapped.winProbabilities
    ),
    confidence: mapped.confidence,
    modelProbability,
  };
}
