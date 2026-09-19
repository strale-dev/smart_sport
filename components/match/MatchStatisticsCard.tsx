import { BarChart3Icon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { MatchStatBarRow } from "@/components/match/MatchStatBarRow";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { TeamLogo } from "@/components/match/TeamLogo";
import {
  buildMatchStatisticsViewModel,
  type MatchStatisticsTeamDerived,
} from "@/lib/match/build-match-statistics-view-model";
import type { MatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import type { Fixture, FixtureTeamStatistics } from "@/types/domain";

type MatchStatisticsCardProps = {
  fixture: Fixture;
  stats?: FixtureTeamStatistics[];
  playerDerived?: MatchStatisticsTeamDerived;
  renderMode: MatchOverviewRenderMode;
};

const emptyPlayerDerived: MatchStatisticsTeamDerived = {
  home: { tacklesTotal: null, duelsTotal: null, averageRating: null },
  away: { tacklesTotal: null, duelsTotal: null, averageRating: null },
};

export function MatchStatisticsCard({
  fixture,
  stats = [],
  playerDerived = emptyPlayerDerived,
  renderMode,
}: MatchStatisticsCardProps) {
  if (renderMode === "pre") {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Statistics</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="liveStats"
            fixture={fixture}
            icon={BarChart3Icon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const sections = buildMatchStatisticsViewModel(fixture, stats, playerDerived);

  if (sections.length === 0) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Statistics</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="liveStats"
            fixture={fixture}
            icon={BarChart3Icon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-3">
        <MatchCardTitle>Statistics</MatchCardTitle>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamLogo
              name={fixture.homeTeam.name}
              logoUrl={fixture.homeTeam.logoUrl}
              className="size-7"
            />
            <span className="truncate text-xs font-medium sm:text-sm">
              {fixture.homeTeam.name}
            </span>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">vs</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-xs font-medium sm:text-sm">
              {fixture.awayTeam.name}
            </span>
            <TeamLogo
              name={fixture.awayTeam.name}
              logoUrl={fixture.awayTeam.logoUrl}
              className="size-7"
            />
          </div>
        </div>
      </MatchCardHeader>
      <MatchCardContent className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            aria-labelledby={`stat-section-${section.title}`}
          >
            <h3
              id={`stat-section-${section.title}`}
              className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase"
            >
              {section.title}
            </h3>
            <ul className="space-y-4">
              {section.rows.map((row) => (
                <li key={row.id}>
                  <MatchStatBarRow
                    row={row}
                    homeTeamName={fixture.homeTeam.name}
                    awayTeamName={fixture.awayTeam.name}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
