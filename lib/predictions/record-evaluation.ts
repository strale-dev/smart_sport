import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { evaluatePrematchPredictionAccuracy } from "@/lib/match/evaluate-prediction-accuracy";
import {
  getActiveModelVersion,
  mapPrematchPredictionRowForFixture,
  readOfficialPrematchPrediction,
} from "@/lib/predictions/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";
import type { Json } from "@/types/supabase";

function resolveFinalGoals(
  fixture: Fixture
): { home: number; away: number } | null {
  const home = fixture.score.fulltimeHome ?? fixture.score.home;
  const away = fixture.score.fulltimeAway ?? fixture.score.away;
  if (home == null || away == null) {
    return null;
  }
  return { home, away };
}

export async function maybeRecordPredictionEvaluation(input: {
  fixtureUuid: string;
  fixture: Fixture;
}): Promise<void> {
  if (!isFinishedFixtureStatus(input.fixture.status)) {
    return;
  }

  const goals = resolveFinalGoals(input.fixture);
  if (!goals) {
    return;
  }

  const kickoffAt = input.fixture.kickoffAt;
  const prematchRow = await readOfficialPrematchPrediction(
    input.fixtureUuid,
    kickoffAt
  );
  if (!prematchRow) {
    return;
  }

  const modelVersion = await getActiveModelVersion();
  const snapshot = await mapPrematchPredictionRowForFixture(
    prematchRow,
    input.fixture.externalId,
    modelVersion.version,
    true
  );
  if (!snapshot) {
    return;
  }

  const accuracyRows = evaluatePrematchPredictionAccuracy(
    input.fixture,
    snapshot
  );
  const byId = Object.fromEntries(accuracyRows.map((row) => [row.id, row]));

  const client = createAdminClient();
  const { error } = await client.from("prediction_evaluations").upsert(
    {
      fixture_id: input.fixtureUuid,
      prediction_id: prematchRow.id,
      hit_1x2: byId["1x2"]?.hit ?? null,
      hit_btts: byId["btts"]?.hit ?? null,
      hit_total_goals_range: byId["total_goals"]?.hit ?? null,
      hit_weaker_scores: byId["weaker_scores"]?.hit ?? null,
      hit_over2: byId["over2"]?.hit ?? null,
      hit_over3: byId["over3"]?.hit ?? null,
      actual_home_goals: goals.home,
      actual_away_goals: goals.away,
      details: {
        accuracyRows,
        modelVersion: modelVersion.version,
        predictionCreatedAt: prematchRow.created_at,
      } as Json,
    },
    { onConflict: "fixture_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert prediction evaluation: ${error.message}`);
  }
}
