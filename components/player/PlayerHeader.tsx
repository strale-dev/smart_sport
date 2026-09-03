import Link from "next/link";

import { FollowComingSoonButton } from "@/components/profile/FollowComingSoonButton";
import { PlayerPhoto } from "@/components/player/PlayerPhoto";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ageFromDateOfBirth,
  formatPlayerFoot,
  formatPlayerPosition,
} from "@/lib/players/display";
import type { Player } from "@/types/domain";

type PlayerHeaderProps = {
  player: Player;
};

export function PlayerHeader({ player }: PlayerHeaderProps) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
  const positionLabel = formatPlayerPosition(player.position);
  const footLabel = formatPlayerFoot(player.preferredFoot);
  const meta = [
    player.nationality,
    age != null ? `${age} yrs` : null,
    positionLabel,
    footLabel ? `${footLabel} foot` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerPhoto name={player.fullName} photoUrl={player.photoUrl} />
          <div className="min-w-0 space-y-1">
            <CardTitle className="font-heading text-xl sm:text-2xl">
              {player.fullName}
            </CardTitle>
            {meta.length > 0 ? (
              <CardDescription className="flex flex-wrap items-center gap-2">
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </CardDescription>
            ) : null}
          </div>
        </div>
        <FollowComingSoonButton />
      </CardHeader>
      {player.currentTeam || player.heightCm || player.weightKg ? (
        <CardContent className="flex flex-wrap items-center gap-2">
          {player.currentTeam ? (
            <Badge
              variant="outline"
              render={<Link href={`/teams/${player.currentTeam.externalId}`} />}
            >
              {player.currentTeam.name}
            </Badge>
          ) : null}
          {player.heightCm ? (
            <span className="text-muted-foreground text-sm">
              {player.heightCm} cm
            </span>
          ) : null}
          {player.weightKg ? (
            <span className="text-muted-foreground text-sm">
              {player.weightKg} kg
            </span>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
