import Link from "next/link";
import { StarIcon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { Badge } from "@/components/ui/badge";
import type { Fixture, FixturePlayerPerformance } from "@/types/domain";

type PlayerOfTheMatchCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  player: FixturePlayerPerformance | null;
};

export function PlayerOfTheMatchCard({
  fixture,
  player,
}: PlayerOfTheMatchCardProps) {
  if (!player) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Player of the match</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="potm"
            fixture={fixture}
            icon={StarIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const teamName =
    player.teamExternalId === fixture.homeTeam.externalId
      ? fixture.homeTeam.name
      : fixture.awayTeam.name;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <MatchCardTitle>Player of the match</MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`/players/${player.playerExternalId}`}
              className="text-base font-semibold hover:underline"
            >
              {player.name}
            </Link>
            <p className="text-muted-foreground text-sm">{teamName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {player.goals != null && player.goals > 0 ? (
                <Badge variant="secondary">
                  {player.goals} goal{player.goals === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {player.assists != null && player.assists > 0 ? (
                <Badge variant="secondary">
                  {player.assists} assist{player.assists === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>
          {player.rating != null ? (
            <div className="bg-primary/10 text-primary rounded-lg px-4 py-2 text-center">
              <p className="text-xs font-medium tracking-wide uppercase">
                Rating
              </p>
              <p className="font-mono text-2xl tabular-nums">
                {player.rating.toFixed(1)}
              </p>
            </div>
          ) : null}
        </div>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
