import { describe, expect, it } from "vitest";

import {
  mapFixture,
  mapFixtureEvent,
  mapFixturePlayerPerformance,
  mapFixtureStatistics,
  mapLeagueDetail,
  mapLeaguePlayerLeaderboardRow,
  mapLineup,
  mapPlayer,
  mapPlayerCareerFromTransfers,
  mapPlayerProfile,
  mapPlayerSeasonStatistics,
  mapSearchPlayer,
  mapSearchTeam,
  mapSquadPlayer,
  mapStandingsGroup,
  mapTeamSeasonStatistics,
  mapTeamSquad,
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
  RawApiFootballPlayerProfile,
  RawApiFootballSearchPlayer,
  RawApiFootballTransfers,
  RawApiFootballSquad,
  RawApiFootballStandingsGroup,
  RawApiFootballTeamDetail,
  RawApiFootballTeamSeasonStatistics,
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
    expect(player.shirtNumber).toBe(8);
    expect(player.averageRating).toBe(8.1);
  });

  it("maps player profile payloads without season stats", () => {
    const player = mapPlayerProfile({
      player: {
        id: 276,
        name: "N. Kanté",
        firstname: "N'Golo",
        lastname: "Kanté",
        age: 33,
        birth: {
          date: "1991-03-29",
          place: "Paris",
          country: "France",
        },
        nationality: "France",
        height: "168 cm",
        weight: "70 kg",
        injured: false,
        photo: "https://example.com/kante.png",
        number: 13,
        position: "Midfielder",
      },
    } satisfies RawApiFootballPlayerProfile);

    expect(player.fullName).toBe("N. Kanté");
    expect(player.position).toBe("MF");
    expect(player.shirtNumber).toBe(13);
    expect(player.heightCm).toBe(168);
  });

  it("maps player season statistics", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballPlayer[]>("player-by-id.json");
    const stats = mapPlayerSeasonStatistics(envelope.response[0]!);

    expect(stats).toHaveLength(1);
    expect(stats[0]?.leagueExternalId).toBe(39);
    expect(stats[0]?.appearances).toBe(1);
    expect(stats[0]?.averageRating).toBe(8.1);
  });

  it("maps player transfer history", () => {
    const envelope = loadApiFootballFixture<RawApiFootballTransfers[]>(
      "player-transfers.json"
    );
    const career = mapPlayerCareerFromTransfers(envelope.response[0]!);

    expect(
      career.map((entry) => entry.team.externalId).sort((a, b) => a - b)
    ).toEqual([33, 211]);
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
    const insert = fixtureToInsert(
      fixture,
      {
        leagueId: "league-uuid",
        seasonId: "season-uuid",
        homeTeamId: "home-uuid",
        awayTeamId: "away-uuid",
        venueId: null,
      },
      envelope.response[0]
    );

    expect(insert.provider_id).toBe(1035037);
    expect(insert.status).toBe("FT");
    expect(insert.score_home).toBe(1);
    expect(insert.provider_payload).toEqual(envelope.response[0]);
  });
});

describe("mapTeamSquad", () => {
  it("maps squad players with positions and shirt numbers", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballSquad[]>("team-squad.json");
    const squad = mapTeamSquad(envelope.response[0]!);

    expect(squad).toHaveLength(2);
    expect(squad[0]?.position).toBe("GK");
    expect(squad[1]?.name).toBe("Bruno Fernandes");
  });
});

describe("mapTeamSeasonStatistics", () => {
  it("maps season statistics buckets", () => {
    const envelope = loadApiFootballFixture<
      RawApiFootballTeamSeasonStatistics[]
    >("team-statistics.json");
    const stats = mapTeamSeasonStatistics(envelope.response[0]!);

    expect(stats.leagueExternalId).toBe(39);
    expect(stats.goalsFor).toBe(32);
    expect(stats.cleanSheets).toBe(6);
    expect(stats.averagePossession).toBe(51);
  });
});

describe("mapSquadPlayer", () => {
  it("maps squad position words to domain positions", () => {
    expect(
      mapSquadPlayer({
        id: 1,
        name: "Virgil van Dijk",
        age: 32,
        number: 4,
        position: "Defender",
        photo: null,
      }).position
    ).toBe("DF");
    expect(
      mapSquadPlayer({
        id: 2,
        name: "Erling Haaland",
        age: 24,
        number: 9,
        position: "Attacker",
        photo: null,
      }).position
    ).toBe("FW");
  });

  it("maps unknown positions to null", () => {
    const player = mapSquadPlayer({
      id: 1,
      name: "Unknown",
      age: 20,
      number: 99,
      position: "X",
      photo: null,
    });

    expect(player.position).toBeNull();
  });
});

describe("mapLeaguePlayerLeaderboardRow", () => {
  it("maps top scorer entries", () => {
    const envelope =
      loadApiFootballFixture<RawApiFootballPlayer[]>("top-scorers.json");
    const row = mapLeaguePlayerLeaderboardRow(envelope.response[0]!, 1);

    expect(row.rank).toBe(1);
    expect(row.player.externalId).toBe(909);
    expect(row.player.fullName).toBe("Bruno Fernandes");
    expect(row.team.name).toBe("Manchester United");
    expect(row.goals).toBe(12);
    expect(row.assists).toBe(8);
    expect(row.appearances).toBe(30);
  });
});
