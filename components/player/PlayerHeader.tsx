import Link from "next/link";

import { TeamLogo } from "@/components/match/TeamLogo";
import { PlayerPhoto } from "@/components/player/PlayerPhoto";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ageFromDateOfBirth,
  formatMarketValue,
  formatPlayerPosition,
} from "@/lib/players/display";
import type { Player } from "@/types/domain";

type PlayerHeaderProps = {
  player: Player;
};

export function PlayerHeader({ player }: PlayerHeaderProps) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
  const positionLabel = formatPlayerPosition(player.position);
  const marketValueLabel = formatMarketValue(player.marketValue);
  const chips = [
    positionLabel,
    player.nationality,
    age != null ? `${age} yrs` : null,
  ].filter((value): value is string => Boolean(value));

  const highlights = [
    player.averageRating != null
      ? { label: "Rating", value: player.averageRating.toFixed(2) }
      : null,
    player.heightCm != null
      ? { label: "Height", value: `${player.heightCm} cm` }
      : null,
    player.weightKg != null
      ? { label: "Weight", value: `${player.weightKg} kg` }
      : null,
    marketValueLabel ? { label: "Value", value: marketValueLabel } : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex items-center gap-4">
          <PlayerPhoto
            name={player.fullName}
            photoUrl={player.photoUrl}
            className="size-16 sm:size-20"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="font-heading truncate text-xl sm:text-2xl">
                {player.fullName}
              </CardTitle>
              {player.shirtNumber != null ? (
                <Badge variant="secondary" className="shrink-0 font-mono">
                  #{player.shirtNumber}
                </Badge>
              ) : null}
            </div>

            {player.currentTeam ? (
              <Link
                href={`/teams/${player.currentTeam.externalId}`}
                className="text-muted-foreground hover:text-foreground flex w-fit max-w-full items-center gap-2 text-sm"
              >
                <TeamLogo
                  name={player.currentTeam.name}
                  logoUrl={player.currentTeam.logoUrl}
                  className="size-5"
                />
                <span className="truncate">{player.currentTeam.name}</span>
              </Link>
            ) : null}

            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <Badge key={chip} variant="outline">
                    {chip}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>

      {highlights.length > 0 ? (
        <>
          <Separator />
          <CardContent className="pt-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.label} className="min-w-0 text-center">
                  <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-medium tabular-nums">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </>
      ) : null}
    </Card>
  );
}
