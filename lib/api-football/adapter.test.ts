import { describe, expect, it } from "vitest";

import {
  mapFixture,
  mapFixtureEvent,
  mapFixturePlayerPerformance,
  mapFixtureStatistics,
  mapLeagueDetail,
  mapLineup,
  mapPlayer,
  mapSearchPlayer,
  mapSearchTeam,
  mapStandingsGroup,
  mapFixtureStatus,
} from "@/lib/api-football/adapter";
import { fixtureToInsert } from "@/lib/api-football/to-db";
import type {
  RawApiFootballEvent,
  RawApiFootballFixture,
  RawApiFootballFixturePlayer,
  RawApiFootballLeagueDetail,
  RawApiFootballLineup,
  RawApiFootballPlayer,
  RawApiFootballSearchPlayer,
  RawApiFootballStandingsGroup,
  RawApiFootballTeamDetail,
} from "@/lib/api-football/types";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

describe("mapFixtureStatus", () => {
  it("maps known statuses", () => {
    expect(mapFixtureStatus("FT")).toBe("FT");
    expect(mapFixtureStatus("1H")).toBe("1H");
  });

  it("falls back to NS for unknown statuses", () => {
    expect(mapFixtureStatus("UNKNOWN")).toBe("NS");
  });
});

describe("mapFixture", () => {
  it("maps a finished fixture", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json");
    const fixture = mapFixture(envelope.response[0]!);

    expect(fixture.externalId).toBe(1035037);
    expect(fixture.status).toBe("FT");
    expect(fixture.homeTeam.name).toBe("Manchester United");
    expect(fixture.score.home).toBe(1);
    expect(fixture.venue?.name).toBe("Old Trafford");
  });

  it("maps a not-started fixture", () => {
    const envelope = loadApiFootballFixture<RawApiFootballFixture[]>(
      "fixtures-by-date.json"
    );
    const fixture = mapFixture(envelope.response[0]!);

    expect(fixture.status).toBe("NS");
    expect(fixture.minute).toBeNull();
  });
});

describe("mapFixtureEvent", () => {
  it("maps goal events with stable external ids", () => {
    const envelope = loadApiFootballFixture<RawApiFootballEvent[]>(
      "fixture-events.json"
    );
    const event = mapFixtureEvent(envelope.response[0]!, 1035037);

    expect(event.type).toBe("Goal");
    expect(event.playerExternalId).toBe(909);
    expect(event.externalEventId).toContain("1035037");
  });
});

describe("mapFixtureStatistics", () => {
  it("maps team statistics including xG and possession", () => {
    const envelope = loadApiFootballFixture<
      import("@/lib/api-football/types").RawApiFootballTeamStatistics[]
    >("fixture-statistics.json");
    const stats = mapFixtureStatistics(envelope.response[0]!);

    expect(stats.teamExternalId).toBe(33);
    expect(stats.shotsOnTarget).toBe(5);
    expect(stats.ballPossession).toBe(58);
    expect(stats.expectedGoals).toBe(1.42);
  });

  it("handles partial statistics payloads", () => {
    const envelope = loadApiFootballFixture<
      import("@/lib/api-football/types").RawApiFootballTeamStatistics[]
    >("fixture-statistics.json");
    const stats = mapFixtureStatistics(envelope.response[1]!);

    expect(stats.expectedGoals).toBeNull();
    expect(stats.shotsOnTarget).toBe(2);
  });
});

describe("mapLineup", () => {
  it("maps confirmed lineups with starters and substitutes", () => {
    const envelope = loadApiFootballFixture<RawApiFootballLineup[]>(
      "fixture-lineups.json"
    );
    const lineup = mapLineup(envelope.response[0]!);

    expect(lineup.teamExternalId).toBe(33);
    expect(lineup.formation).toBe("4-2-3-1");
    expect(lineup.players).toHaveLength(2);
    expect(lineup.players[0]?.isStarting).toBe(true);
  });
});

describe("mapFixturePlayerPerformance", () => {
  it("maps player match performances", () => {
    const envelope = loadApiFootballFixture<RawApiFootballFixturePlayer[]>(
      "fixture-players.json"
    );
    const performances = mapFixturePlayerPerformance(envelope.response[0]!);

    expect(performances).toHaveLength(1);
    expect(performances[0]?.rating).toBe(8.1);
    expect(performances[0]?.goals).toBe(1);
  });
});

describe("mapTeam and mapPlayer", () => {
  it("maps team detail payloads", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballTeamDetail[]>("team-by-id.json");
    const team = mapSearchTeam(envelope.response[0]!);

    expect(team.externalId).toBe(33);
    expect(team.code).toBe("MUN");
    expect(team.venue?.name).toBe("Old Trafford");
  });

  it("maps player detail payloads", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballPlayer[]>("player-by-id.json");
    const player = mapPlayer(envelope.response[0]!);

    expect(player.fullName).toBe("Bruno Fernandes");
    expect(player.heightCm).toBe(179);
    expect(player.position).toBe("MF");
    expect(player.currentTeam?.externalId).toBe(33);
  });

  it("maps search player payloads", () => {
    const envelope = loadApiFootballFixture<RawApiFootballSearchPlayer[]>(
      "search-players.json"
    );
    const player = mapSearchPlayer(envelope.response[0]!);

    expect(player.fullName).toBe("Bruno Fernandes");
    expect(player.currentTeam).toBeNull();
  });
});

describe("mapLeagueDetail and standings", () => {
  it("maps league detail with seasons", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballLeagueDetail[]>("league-by-id.json");
    const detail = mapLeagueDetail(envelope.response[0]!);

    expect(detail.league.externalId).toBe(39);
    expect(detail.seasons).toHaveLength(2);
    expect(detail.seasons[0]?.isCurrent).toBe(true);
  });

  it("maps standings groups", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballStandingsGroup[]>("standings.json");
    const groups = mapStandingsGroup(envelope.response[0]!);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows[0]?.team.name).toBe("Manchester City");
    expect(groups[0]?.rows[0]?.points).toBe(3);
  });
});

describe("fixtureToInsert", () => {
  it("maps domain fixtures to db insert shape", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json");
    const fixture = mapFixture(envelope.response[0]!);
    const insert = fixtureToInsert(fixture, envelope.response[0]);

    expect(insert.provider_id).toBe(1035037);
    expect(insert.status).toBe("FT");
    expect(insert.score_home).toBe(1);
    expect(insert.provider_payload).toEqual(envelope.response[0]);
  });
});
