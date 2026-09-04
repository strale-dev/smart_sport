import type { H2HMeeting, H2HScope, H2HSummary } from "@/types/domain";

import type { TeamFixtureRow } from "@/lib/analytics/compute-form";

export function canonicalTeamPair(
  teamAUuid: string,
  teamBUuid: string
): [string, string] {
  return teamAUuid < teamBUuid
    ? [teamAUuid, teamBUuid]
    : [teamBUuid, teamAUuid];
}

export function summarizeH2HMeetings(
  rows: TeamFixtureRow[],
  teamAProviderId: number,
  teamBProviderId: number,
  windowSize: number,
  scope: H2HScope
): H2HSummary {
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  let teamAGoals = 0;
  let teamBGoals = 0;

  const meetings: H2HMeeting[] = rows.map((row) => {
    const home = row.home_team!;
    const away = row.away_team!;
    const homeScore = row.score_home;
    const awayScore = row.score_away;

    if (homeScore !== null && awayScore !== null) {
      const homeIsA = home.provider_id === teamAProviderId;
      const aGoals = homeIsA ? homeScore : awayScore;
      const bGoals = homeIsA ? awayScore : homeScore;
      teamAGoals += aGoals;
      teamBGoals += bGoals;

      if (aGoals > bGoals) {
        teamAWins += 1;
      } else if (aGoals < bGoals) {
        teamBWins += 1;
      } else {
        draws += 1;
      }
    }

    return {
      fixtureExternalId: row.provider_id,
      kickoffAt: row.kickoff_at,
      homeTeamName: home.name,
      awayTeamName: away.name,
      homeScore,
      awayScore,
      leagueName: row.league?.name ?? null,
    };
  });

  return {
    teamAExternalId: teamAProviderId,
    teamBExternalId: teamBProviderId,
    teamAWins,
    teamBWins,
    draws,
    teamAGoals,
    teamBGoals,
    windowSize,
    scope,
    meetings,
  };
}
