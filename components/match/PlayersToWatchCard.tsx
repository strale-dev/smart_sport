import Link from "next/link";
import { UserIcon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type { Fixture } from "@/types/domain";

import { Badge } from "@/components/ui/badge";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";

type PlayersToWatchCardProps = {
  fixture: Fixture;
  data: PlayersToWatchResult;
};

const copyBySource = {
  predicted: {
    title: "Players to Watch",
    description: "Predicted impact based on recent form",
    emptyId: "playersToWatchPredicted" as const,
  },
  actual: {
    title: "Top Performers",
    description: "Based on live match ratings",
    emptyId: "playersToWatchActual" as const,
  },
} as const;

export function PlayersToWatchCard({ fixture, data }: PlayersToWatchCardProps) {
  const copy = copyBySource[data.source];

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>{copy.title}</MatchCardTitle>
          <Badge variant="outline">{copy.description}</Badge>
        </div>
        <MatchCardDescription>
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent>
        {data.players.length === 0 ? (
          <MatchEmptyStateFromFixture
            id={copy.emptyId}
            fixture={fixture}
            icon={UserIcon}
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <div className="space-y-3">
            {data.players.map((player) => (
              <div
                key={`${player.teamExternalId}-${player.playerExternalId ?? player.name}`}
                className="border-border/70 bg-muted/20 rounded-xl border px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    {player.playerExternalId != null ? (
                      <Link
                        href={`/players/${player.playerExternalId}`}
                        className="hover:text-primary truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {player.name}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">
                        {player.name}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {player.teamName}
                      {player.position ? ` · ${player.position}` : ""}
                      {player.shirtNumber != null
                        ? ` · #${player.shirtNumber}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {player.score.toFixed(1)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {player.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
