import { isAiUpdatedMarkerFresh } from "@/lib/live/ai-updated-marker";
import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import type { Fixture } from "@/types/domain";

function makeFixture(id: number, leagueId: number): Fixture {
  return {
    externalId: id,
    league: {
      externalId: leagueId,
      name: "League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2026,
    homeTeam: {
      externalId: 10,
      name: "Home",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 20,
      name: "Away",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-12T15:00:00.000Z",
    status: "1H",
    minute: 10,
    score: {
      home: 0,
      away: 0,
      halftimeHome: null,
      halftimeAway: null,
      fulltimeHome: null,
      fulltimeAway: null,
      extratimeHome: null,
      extratimeAway: null,
      penaltyHome: null,
      penaltyAway: null,
    },
    venue: null,
    referee: null,
    round: null,
  };
}

const now = new Date("2026-09-12T15:02:00.000Z");
const context: ImportanceContext = {
  prestigeByLeagueId: new Map([
    [39, 90],
    [2, 90],
  ]),
  standingsByFixtureId: new Map(),
  h2hInterestByFixtureId: new Map(),
  preferredLeagueExternalId: null,
  now,
};

const a = makeFixture(1, 39);
const b = makeFixture(2, 2);
const ranked = rankFixturesByImportance([a, b], context);

if (ranked[0]?.score !== ranked[1]?.score) {
  console.error("Expected tied importance scores for smoke fixtures");
  process.exit(1);
}

const withAi = [
  { ...a, aiUpdatedAt: "2026-09-12T15:01:30.000Z" },
  { ...b, aiUpdatedAt: null },
];

const sorted = ranked
  .sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftRow = withAi.find(
      (row) => row.externalId === left.fixture.externalId
    );
    const rightRow = withAi.find(
      (row) => row.externalId === right.fixture.externalId
    );
    const leftFresh = isAiUpdatedMarkerFresh(leftRow?.aiUpdatedAt ?? null, now);
    const rightFresh = isAiUpdatedMarkerFresh(
      rightRow?.aiUpdatedAt ?? null,
      now
    );

    if (leftFresh !== rightFresh) {
      return leftFresh ? -1 : 1;
    }

    return 0;
  })
  .map(({ fixture }) => fixture.externalId);

if (sorted[0] !== 1) {
  console.error("Expected fixture with fresh AI first", sorted);
  process.exit(1);
}

console.log("phase5-live-center-smoke: AI tie-breaker OK");
