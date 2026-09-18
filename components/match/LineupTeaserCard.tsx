import Link from "next/link";

import { LineupFieldView } from "@/components/match/lineups/LineupFieldView";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  buildMatchEmptyContext,
  getMatchEmptyState,
} from "@/lib/match/empty-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardFooter,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import {
  buildLineupViewModel,
  lineupViewModelHasContent,
} from "@/lib/lineups/build-lineup-view-model";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  Lineup,
} from "@/types/domain";
import { UsersIcon } from "lucide-react";

type LineupTeaserCardProps = {
  fixture: Fixture;
  lineups: Lineup[];
  performances?: FixturePlayerPerformance[];
  events?: FixtureEvent[];
  sidelined?: FixtureSidelinedPlayer[];
};

export function LineupTeaserCard({
  fixture,
  lineups,
  performances = [],
  events = [],
  sidelined = [],
}: LineupTeaserCardProps) {
  const model = buildLineupViewModel({
    fixture,
    lineups,
    performances,
    events,
    sidelined,
  });
  const hasLineup = lineupViewModelHasContent(model, sidelined);
  const lineupsHref = buildMatchHref(fixture.externalId, "lineups");
  const emptyPrimaryAction = !hasLineup
    ? getMatchEmptyState("lineupTeaser", buildMatchEmptyContext(fixture))
        .actions?.[0]
    : undefined;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>Lineups</MatchCardTitle>
          {hasLineup ? (
            <Badge variant="outline">{model.statusLabel}</Badge>
          ) : null}
        </div>
        {hasLineup ? (
          <MatchCardDescription>
            {model.home?.formation ?? "–"} vs {model.away?.formation ?? "–"}
          </MatchCardDescription>
        ) : null}
      </MatchCardHeader>
      <MatchCardContent>
        {hasLineup ? (
          <LineupFieldView
            model={model}
            variant="compact"
            showMatchBadges={false}
          />
        ) : (
          <MatchEmptyStateFromFixture
            id="lineupTeaser"
            fixture={fixture}
            icon={UsersIcon}
          />
        )}
      </MatchCardContent>
      {hasLineup ? (
        <MatchCardFooter className="border-border/70 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={lineupsHref} />}
          >
            See full lineups
          </Button>
        </MatchCardFooter>
      ) : emptyPrimaryAction ? (
        <MatchCardFooter className="border-border/70 border-t pt-4">
          <Button
            variant={emptyPrimaryAction.variant ?? "default"}
            size="sm"
            nativeButton={false}
            render={<Link href={emptyPrimaryAction.href} />}
          >
            {emptyPrimaryAction.label}
          </Button>
        </MatchCardFooter>
      ) : null}
    </MatchAnalyticsCard>
  );
}
