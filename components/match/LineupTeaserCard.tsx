import Link from "next/link";

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
import { buildMatchHref } from "@/lib/fixtures/match-url";
import { parseLineupGrid } from "@/lib/lineups/grid";
import type { Fixture, Lineup, LineupPlayer } from "@/types/domain";
import { UsersIcon } from "lucide-react";

type LineupTeaserCardProps = {
  fixture: Fixture;
  lineups: Lineup[];
};

function findLineup(
  lineups: Lineup[],
  teamExternalId: number
): Lineup | undefined {
  return lineups.find((lineup) => lineup.teamExternalId === teamExternalId);
}

function sortStarters(players: LineupPlayer[]): LineupPlayer[] {
  return players
    .filter((player) => player.isStarting)
    .slice()
    .sort((a, b) => {
      const gridA = parseLineupGrid(a.grid);
      const gridB = parseLineupGrid(b.grid);
      if (gridA && gridB) {
        if (gridA.row !== gridB.row) {
          return gridA.row - gridB.row;
        }
        return gridA.col - gridB.col;
      }
      if (gridA) {
        return -1;
      }
      if (gridB) {
        return 1;
      }
      const numA = a.shirtNumber ?? 999;
      const numB = b.shirtNumber ?? 999;
      return numA - numB;
    });
}

function StarterRow({ player }: { player: LineupPlayer }) {
  const label = (
    <span className="text-sm">
      <span className="font-mono tabular-nums">
        {player.shirtNumber ?? "–"}
      </span>{" "}
      {player.name}
      {player.position ? (
        <span className="text-muted-foreground"> · {player.position}</span>
      ) : null}
    </span>
  );

  if (player.playerExternalId) {
    return (
      <Link
        href={`/players/${player.playerExternalId}`}
        className="hover:text-primary focus-visible:ring-ring/50 block rounded outline-none focus-visible:ring-[3px]"
      >
        {label}
      </Link>
    );
  }

  return <div>{label}</div>;
}

function TeamLineupTeaser({
  teamName,
  lineup,
}: {
  teamName: string;
  lineup: Lineup | undefined;
}) {
  if (!lineup) {
    return null;
  }

  const starters = sortStarters(lineup.players);
  if (starters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {teamName}
        {lineup.formation ? (
          <span className="text-muted-foreground font-normal">
            {" "}
            · {lineup.formation}
          </span>
        ) : null}
      </h3>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {starters.map((player, index) => (
          <li key={`${player.playerExternalId ?? player.name}-${index}`}>
            <StarterRow player={player} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineupTeaserCard({ fixture, lineups }: LineupTeaserCardProps) {
  const homeLineup = findLineup(lineups, fixture.homeTeam.externalId);
  const awayLineup = findLineup(lineups, fixture.awayTeam.externalId);
  const hasLineup = Boolean(homeLineup || awayLineup);
  const lineupsHref = buildMatchHref(fixture.externalId, "lineups");
  const emptyPrimaryAction = !hasLineup
    ? getMatchEmptyState("lineupTeaser", buildMatchEmptyContext(fixture))
        .actions?.[0]
    : undefined;

  const statusLabel =
    homeLineup?.isConfirmed || awayLineup?.isConfirmed
      ? "Confirmed lineup"
      : hasLineup
        ? "Predicted lineup"
        : null;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>Lineups</MatchCardTitle>
          {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
        </div>
        {hasLineup ? (
          <MatchCardDescription>
            {homeLineup?.formation ?? "–"} vs {awayLineup?.formation ?? "–"}
          </MatchCardDescription>
        ) : null}
      </MatchCardHeader>
      <MatchCardContent>
        {hasLineup ? (
          <div className="space-y-4">
            <TeamLineupTeaser
              teamName={fixture.homeTeam.name}
              lineup={homeLineup}
            />
            <TeamLineupTeaser
              teamName={fixture.awayTeam.name}
              lineup={awayLineup}
            />
          </div>
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
