import { buildFixturesHref } from "@/lib/fixtures/url";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import { buildLeagueHref } from "@/lib/leagues/url";
import { buildTeamHref } from "@/lib/teams/url";
import type { FixtureStatus } from "@/types/domain";

export type MatchEmptyPhase = "pre" | "live" | "finished";

export type MatchEmptyStateId =
  | "lineups"
  | "lineupTeaser"
  | "standings"
  | "timeline"
  | "liveStats"
  | "momentum"
  | "comparison"
  | "formTeam"
  | "h2h"
  | "relatedFixtures"
  | "playersToWatchPredicted"
  | "playersToWatchActual"
  | "liveProbabilityDelta";

export type MatchEmptyTeamRef = {
  externalId: number;
  name: string;
};

export type MatchEmptyContext = {
  fixtureId: number;
  status: FixtureStatus;
  homeTeam: MatchEmptyTeamRef;
  awayTeam: MatchEmptyTeamRef;
  league: { externalId: number; name: string };
  teamName?: string;
  teamExternalId?: number;
};

export type MatchEmptyAction = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};

export type MatchEmptyStateResult = {
  title: string;
  description?: string;
  actions?: MatchEmptyAction[];
};

export function getFixtureEmptyPhase(status: FixtureStatus): MatchEmptyPhase {
  return getMatchOverviewRenderMode(status);
}

export function buildMatchEmptyContext(
  fixture: {
    externalId: number;
    status: FixtureStatus;
    homeTeam: MatchEmptyTeamRef;
    awayTeam: MatchEmptyTeamRef;
    league: { externalId: number; name: string };
  },
  overrides: Partial<
    Pick<MatchEmptyContext, "teamName" | "teamExternalId">
  > = {}
): MatchEmptyContext {
  return {
    fixtureId: fixture.externalId,
    status: fixture.status,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    league: fixture.league,
    ...overrides,
  };
}

function overviewHref(fixtureId: number): string {
  return buildMatchHref(fixtureId, "overview");
}

function lineupsEmpty(
  phase: MatchEmptyPhase,
  ctx: MatchEmptyContext
): MatchEmptyStateResult {
  if (phase === "finished") {
    return {
      title: "No lineup data for this match",
      description: "We do not have confirmed or predicted lineups on record.",
      actions: [
        {
          label: "Back to overview",
          href: overviewHref(ctx.fixtureId),
          variant: "outline",
        },
      ],
    };
  }

  if (phase === "live") {
    return {
      title: "Lineups updating",
      description:
        "Starting elevens may still be loading. Check back in a moment.",
      actions: [
        {
          label: "Back to overview",
          href: overviewHref(ctx.fixtureId),
        },
      ],
    };
  }

  return {
    title: "Lineups not confirmed yet",
    description:
      "Official or predicted starting elevens usually appear closer to kickoff.",
    actions: [
      {
        label: "Preview with AI",
        href: buildMatchHref(ctx.fixtureId, "ai"),
      },
      {
        label: "View squad",
        href: buildTeamHref(ctx.homeTeam.externalId, "squad"),
        variant: "outline",
      },
    ],
  };
}

export function getMatchEmptyState(
  id: MatchEmptyStateId,
  context: MatchEmptyContext
): MatchEmptyStateResult {
  const phase = getFixtureEmptyPhase(context.status);
  const { fixtureId, homeTeam, awayTeam, league } = context;

  switch (id) {
    case "lineups":
    case "lineupTeaser":
      return lineupsEmpty(phase, context);

    case "standings":
      return {
        title: "League table not available yet",
        description: `We do not have a standings table for ${league.name} right now. Check the league page or try again later.`,
        actions: [
          {
            label: `Open ${league.name}`,
            href: buildLeagueHref(league.externalId, { tab: "standings" }),
          },
          {
            label: "Browse fixtures",
            href: buildFixturesHref({}, { league: league.externalId }),
            variant: "outline",
          },
        ],
      };

    case "timeline":
      if (phase === "pre") {
        return {
          title: "Kickoff has not started",
          description:
            "Goals, cards, and substitutions will show here once the match is underway.",
          actions: [
            { label: "Live Center", href: "/live" },
            {
              label: "Back to overview",
              href: overviewHref(fixtureId),
              variant: "outline",
            },
          ],
        };
      }
      if (phase === "finished") {
        return {
          title: "No event timeline recorded",
          description:
            "This match does not have a detailed event feed in our data.",
          actions: [
            {
              label: "Back to overview",
              href: overviewHref(fixtureId),
              variant: "outline",
            },
          ],
        };
      }
      return {
        title: "No events yet",
        description:
          "Goals, cards, and substitutions will appear here as they happen.",
        actions: [
          { label: "Live Center", href: "/live" },
          {
            label: "Back to overview",
            href: overviewHref(fixtureId),
            variant: "outline",
          },
        ],
      };

    case "liveStats":
      if (phase === "pre") {
        return {
          title: "Stats after kickoff",
          description:
            "Live match statistics will appear once the match gets going.",
          actions: [
            { label: "Live Center", href: "/live" },
            {
              label: "Form & head-to-head",
              href: buildMatchHref(fixtureId, "matches"),
              variant: "outline",
            },
          ],
        };
      }
      if (phase === "finished") {
        return {
          title: "Full-time stats unavailable",
          description:
            "We do not have a complete stat sheet for this match yet.",
          actions: [
            {
              label: "Back to overview",
              href: overviewHref(fixtureId),
              variant: "outline",
            },
          ],
        };
      }
      return {
        title: "Stats not in yet",
        description:
          "Match statistics usually arrive a few minutes into the game.",
        actions: [
          { label: "Live Center", href: "/live" },
          {
            label: "Back to overview",
            href: overviewHref(fixtureId),
            variant: "outline",
          },
        ],
      };

    case "momentum":
      return {
        title:
          phase === "live"
            ? "Building momentum chart"
            : "Not enough data for momentum",
        description:
          phase === "live"
            ? "Momentum needs events and shot data from the live feed."
            : "We need more live events to draw the momentum chart.",
      };

    case "comparison":
      return {
        title: "Not enough to compare yet",
        description:
          phase === "live"
            ? "Comparison fills in as live stats and recent form arrive."
            : "We need match stats or recent form before comparing these teams.",
        actions: [
          {
            label: "Form & head-to-head",
            href: buildMatchHref(fixtureId, "matches"),
          },
          {
            label: `${homeTeam.name} statistics`,
            href: buildTeamHref(homeTeam.externalId, "statistics"),
            variant: "outline",
          },
        ],
      };

    case "formTeam": {
      const teamName = context.teamName ?? "this team";
      const teamId =
        context.teamExternalId ??
        (teamName === awayTeam.name
          ? awayTeam.externalId
          : homeTeam.externalId);

      return {
        title: `No recent results for ${teamName}`,
        description:
          "Finished matches will show here once we have results in our window.",
        actions: [
          {
            label: `${teamName} fixtures`,
            href: buildTeamHref(teamId, "matches"),
          },
          {
            label: "Back to overview",
            href: overviewHref(fixtureId),
            variant: "outline",
          },
        ],
      };
    }

    case "h2h":
      return {
        title: "No head-to-head history",
        description:
          "These teams have no recorded meetings in this scope in our data.",
        actions: [
          {
            label: `${homeTeam.name} fixtures`,
            href: buildTeamHref(homeTeam.externalId, "matches"),
          },
          {
            label: "Browse league fixtures",
            href: buildFixturesHref({}, { league: league.externalId }),
            variant: "outline",
          },
        ],
      };

    case "relatedFixtures":
      return {
        title: "No other fixtures for these clubs",
        description:
          "We do not have additional matches for these teams in the current window.",
        actions: [
          {
            label: "Browse league fixtures",
            href: buildFixturesHref({}, { league: league.externalId }),
          },
          {
            label: "Live Center",
            href: "/live",
            variant: "outline",
          },
        ],
      };

    case "playersToWatchPredicted":
      return {
        title: "Lineups not confirmed yet",
        description:
          "Predicted player impact appears once lineups are available.",
        actions: [
          {
            label: "Open lineups",
            href: buildMatchHref(fixtureId, "lineups"),
          },
          {
            label: "Preview with AI",
            href: buildMatchHref(fixtureId, "ai"),
            variant: "outline",
          },
        ],
      };

    case "playersToWatchActual":
      return {
        title: "No player ratings yet",
        description:
          "Top performers will appear once match ratings are available.",
        actions: [
          {
            label: "Open lineups",
            href: buildMatchHref(fixtureId, "lineups"),
          },
        ],
      };

    case "liveProbabilityDelta":
      return {
        title: "No model baseline yet",
        description:
          "Pre-match win probabilities will appear here once this fixture is analyzed.",
        actions: [
          {
            label: "Open AI Engine",
            href: buildMatchHref(fixtureId, "ai"),
          },
        ],
      };

    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
