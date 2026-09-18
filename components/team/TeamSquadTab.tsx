import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlayerPosition } from "@/lib/players/display";
import {
  groupSquadByPosition,
  orderedSquadPositionKeys,
  SQUAD_POSITION_LABELS,
} from "@/lib/teams/squad";
import type { SquadPlayer } from "@/types/domain";
import { UsersIcon } from "lucide-react";

type TeamSquadTabProps = {
  squad: SquadPlayer[];
};

function PlayerCard({ player }: { player: SquadPlayer }) {
  const positionLabel = formatPlayerPosition(player.position);

  return (
    <Link
      href={`/players/${player.externalId}`}
      className="border-border/70 hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      {player.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photoUrl}
          alt=""
          className="size-10 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full text-xs font-medium">
          {player.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.name}</p>
        <p className="text-muted-foreground text-xs">
          {positionLabel ?? "–"}
          {player.age != null ? ` · ${player.age} yrs` : ""}
        </p>
      </div>
      {player.shirtNumber != null ? (
        <span className="font-mono text-sm tabular-nums">
          {player.shirtNumber}
        </span>
      ) : null}
    </Link>
  );
}

export function TeamSquadTab({ squad }: TeamSquadTabProps) {
  if (squad.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Squad unavailable"
        description="The provider has not published a roster for this team yet."
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
      />
    );
  }

  const groups = groupSquadByPosition(squad);
  const orderedKeys = orderedSquadPositionKeys(groups);

  return (
    <div className="space-y-6">
      {orderedKeys.map((position) => {
        const players = groups.get(position) ?? [];

        return (
          <Card key={position} className="w-full">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {position === "OTHER"
                  ? "Other"
                  : SQUAD_POSITION_LABELS[position]}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <PlayerCard key={player.externalId} player={player} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
