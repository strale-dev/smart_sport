/**
 * UI-B3 match page regression smoke (after Overview B1/B2).
 *
 * Prerequisites (.env.local):
 * - API_FOOTBALL_INGEST_ONLY=true
 * - SUPABASE_SERVICE_ROLE_KEY
 * - bootstrap:match-details for pinned FT fixtures
 * - A live fixture with ingested stats in Postgres (required)
 *
 * Outputs fixture ids for Playwright: UI_B3_FT_FIXTURE_ID, UI_B3_LIVE_FIXTURE_ID
 */

import { isApiFootballIngestOnly } from "@/lib/env";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import {
  assertOverviewHasDbData,
  shouldReuseLiveOverviewSnapshot,
} from "@/lib/match/overview-panel-invariants";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import {
  findFtWithStatsFixture,
  findLiveFixtureWithData,
  findRichFtFixture,
  loadFixtureCandidates,
  PINNED_MATCH_QA_FIXTURES,
} from "@/lib/qa/match-fixtures";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

async function assertPinnedFtOverview() {
  const fixtureId = PINNED_MATCH_QA_FIXTURES.ftWithXg;
  const { data: fixture } = await getFixtureById(fixtureId);
  if (!fixture) {
    throw new Error(`Pinned FT fixture ${fixtureId} not found`);
  }

  const [eventsResult, statsResult] = await Promise.all([
    getFixtureEvents(fixtureId),
    getFixtureStatistics(fixtureId),
  ]);

  const renderMode = getMatchOverviewRenderMode(fixture.status);
  assertOverviewHasDbData({
    renderMode,
    events: eventsResult.data,
    statistics: statsResult.data,
    fixtureLabel: `pinned FT ${fixtureId}`,
  });

  if (eventsResult.data.length === 0 || statsResult.data.length === 0) {
    console.warn(
      `Pinned FT ${fixtureId} missing rows — will try dynamic FT fallback`
    );
    return null;
  }

  const buckets = computeMatchMomentum(
    eventsResult.data,
    statsResult.data,
    fixture.minute ?? 90
  );
  if (buckets.length === 0) {
    throw new Error(`Pinned FT ${fixtureId}: expected momentum buckets`);
  }

  console.log("Pinned FT overview OK:", {
    fixtureId,
    events: eventsResult.data.length,
    stats: statsResult.data.length,
    momentumBuckets: buckets.length,
  });

  return fixtureId;
}

async function assertNsPrematchShell() {
  const fixtureId = PINNED_MATCH_QA_FIXTURES.nsNoLineups;
  const { data: fixture } = await getFixtureById(fixtureId);
  if (!fixture) {
    throw new Error(`Pinned NS fixture ${fixtureId} not found`);
  }

  const playersToWatch = await getPlayersToWatch(fixture);
  console.log("Pinned NS prematch shell OK:", {
    fixtureId,
    phase: playersToWatch.phase,
    players: playersToWatch.players.length,
  });

  return fixtureId;
}

async function resolveDynamicFtId(pinnedFtId: number | null): Promise<number> {
  if (pinnedFtId != null) {
    return pinnedFtId;
  }

  const candidates = await loadFixtureCandidates();
  const rich =
    findRichFtFixture(candidates) ?? findFtWithStatsFixture(candidates);
  if (!rich) {
    throw new Error(
      "No FT fixture with stats in Postgres. Run bootstrap:match-details."
    );
  }

  console.warn("Using dynamic FT fallback:", rich);
  return rich.provider_id;
}

async function assertLiveSnapshotPath(liveProviderId: number) {
  const { data: fixture } = await getFixtureById(liveProviderId);
  if (!fixture) {
    throw new Error(`Live fixture ${liveProviderId} not found`);
  }

  if (!isLiveFixtureStatus(fixture.status)) {
    throw new Error(
      `Fixture ${liveProviderId} status ${fixture.status} is not live`
    );
  }

  const renderMode = getMatchOverviewRenderMode(fixture.status);
  if (renderMode !== "live") {
    throw new Error(`Expected live render mode for ${liveProviderId}`);
  }

  const [{ data: events }, { data: statistics }] = await Promise.all([
    getFixtureEvents(liveProviderId),
    getFixtureStatistics(liveProviderId),
  ]);

  const initialLiveSnapshot: MatchLiveSnapshot = {
    fixture,
    events,
    statistics,
  };

  const reuse = shouldReuseLiveOverviewSnapshot(
    renderMode,
    initialLiveSnapshot
  );
  if (!reuse) {
    throw new Error("Live overview should reuse SSR snapshot");
  }

  assertOverviewHasDbData({
    renderMode,
    events: initialLiveSnapshot.events,
    statistics: initialLiveSnapshot.statistics,
    fixtureLabel: `live ${liveProviderId}`,
  });

  console.log("Live snapshot path OK:", {
    fixtureId: liveProviderId,
    status: fixture.status,
    reuseLiveSnapshot: reuse,
    events: events.length,
    statistics: statistics.length,
  });

  return liveProviderId;
}

async function main() {
  if (!isApiFootballIngestOnly()) {
    console.error(
      "ui-b3:smoke requires API_FOOTBALL_INGEST_ONLY=true (Postgres reads)."
    );
    process.exit(1);
  }

  const pinnedFtId = await assertPinnedFtOverview().catch((error) => {
    console.warn(String(error));
    return null;
  });

  const nsId = await assertNsPrematchShell();
  const ftId = await resolveDynamicFtId(pinnedFtId);

  const candidates = await loadFixtureCandidates();
  const liveCandidate = findLiveFixtureWithData(candidates);
  if (!liveCandidate) {
    console.error(
      "No live fixture with ingested stats found. Run sync:fixtures and ensure a live match is polling."
    );
    process.exit(1);
  }

  const liveId = await assertLiveSnapshotPath(liveCandidate.provider_id);

  const summary = { ftId, liveId, nsId };
  console.log("\nui-b3:smoke passed.");
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    "\nFor Playwright, set UI_B3_FT_FIXTURE_ID and UI_B3_LIVE_FIXTURE_ID in .env.local if needed."
  );
}

main().catch((error) => {
  console.error("ui-b3:smoke failed:", error);
  process.exit(1);
});
