import { FollowComingSoonButton } from "@/components/profile/FollowComingSoonButton";
import { TeamLogo } from "@/components/match/TeamLogo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Team } from "@/types/domain";

type TeamHeaderProps = {
  team: Team;
};

export function TeamHeader({ team }: TeamHeaderProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo
            name={team.name}
            logoUrl={team.logoUrl}
            className="size-14"
          />
          <div className="min-w-0 space-y-1">
            <CardTitle className="font-heading text-xl sm:text-2xl">
              {team.name}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              {team.country?.name ? <span>{team.country.name}</span> : null}
              <Badge variant="outline">
                {team.isNational ? "National team" : "Club"}
              </Badge>
            </CardDescription>
          </div>
        </div>
        <FollowComingSoonButton />
      </CardHeader>
      {team.code ? (
        <CardContent>
          <p className="text-muted-foreground font-mono text-sm">{team.code}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
