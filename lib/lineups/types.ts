import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  Lineup,
  LineupPlayer,
} from "@/types/domain";

export type LineupStatusLabel = "Lineups" | "Possible lineups";

export type LineupMatchBadges = {
  goals: number;
  assists: number;
};

export type LineupDisplayPlayer = LineupPlayer & {
  photoUrl: string | null;
  rating: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  isCaptain: boolean;
  matchBadges: LineupMatchBadges;
};

export type LineupTeamViewModel = {
  teamExternalId: number;
  teamName: string;
  teamLogoUrl: string | null;
  formation: string | null;
  coachName: string | null;
  coachPhotoUrl: string | null;
  starters: LineupDisplayPlayer[];
  substitutes: LineupDisplayPlayer[];
  injured: FixtureSidelinedPlayer[];
  suspended: FixtureSidelinedPlayer[];
};

export type LineupFieldViewModel = {
  statusLabel: LineupStatusLabel;
  home: LineupTeamViewModel | null;
  away: LineupTeamViewModel | null;
};

export type BuildLineupViewModelInput = {
  fixture: Fixture;
  lineups: Lineup[];
  performances: FixturePlayerPerformance[];
  events: FixtureEvent[];
  sidelined: FixtureSidelinedPlayer[];
};
