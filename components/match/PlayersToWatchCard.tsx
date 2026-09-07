import Link from "next/link";
import { UserIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type { Fixture } from "@/types/domain";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlayersToWatchCardProps = {
  fixture: Fixture;
  data: PlayersToWatchResult;
};

const copyBySource = {
  predicted: {
    title: "Players to Watch",
    description: "Predicted impact based on recent form",
    emptyTitle: "Lineups not confirmed yet",
    emptyDescription:
      "Predicted player impact will appear once lineups are available.",
  },
  actual: {
    title: "Top Performers",
    description: "Based on live match ratings",
    emptyTitle: "No player ratings yet",
    emptyDescription:
      "Player performance data will appear once match ratings are available.",
  },
} as const;

export function PlayersToWatchCard({ fixture, data }: PlayersToWatchCardProps) {
  const copy = copyBySource[data.source];

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">{copy.title}</CardTitle>
          <Badge variant="outline">{copy.description}</Badge>
        </div>
        <CardDescription>
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.players.length === 0 ? (
          <EmptyState
            icon={UserIcon}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
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
      </CardContent>
    </Card>
  );
}
