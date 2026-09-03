import { UsersIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { LineupPitch } from "@/components/match/LineupPitch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Fixture, Lineup } from "@/types/domain";

type LineupsCardProps = {
  fixture: Fixture;
  lineups: Lineup[];
};

function findLineup(
  lineups: Lineup[],
  teamExternalId: number
): Lineup | undefined {
  return lineups.find((lineup) => lineup.teamExternalId === teamExternalId);
}

function BenchList({ lineup }: { lineup: Lineup }) {
  const subs = lineup.players.filter((player) => !player.isStarting);
  if (subs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Substitutes
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {subs.map((player, index) => (
          <div
            key={`${player.playerExternalId ?? player.name}-${index}`}
            className="border-border/70 rounded-lg border px-3 py-2 text-sm"
          >
            <span className="font-mono tabular-nums">
              {player.shirtNumber ?? "–"}
            </span>{" "}
            {player.name}
            {player.position ? (
              <span className="text-muted-foreground">
                {" "}
                · {player.position}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineupsCard({ fixture, lineups }: LineupsCardProps) {
  const homeLineup = findLineup(lineups, fixture.homeTeam.externalId);
  const awayLineup = findLineup(lineups, fixture.awayTeam.externalId);

  if (!homeLineup && !awayLineup) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">Lineups</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UsersIcon}
            title="Lineups not confirmed yet"
            description="Official or predicted lineups will appear here closer to kickoff."
          />
        </CardContent>
      </Card>
    );
  }

  const statusLabel =
    homeLineup?.isConfirmed || awayLineup?.isConfirmed
      ? "Confirmed lineup"
      : "Predicted lineup";

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">Lineups</CardTitle>
          <Badge variant="outline">{statusLabel}</Badge>
        </div>
        <CardDescription>
          {homeLineup?.formation ?? "–"} vs {awayLineup?.formation ?? "–"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {homeLineup ? (
          <div className="space-y-4">
            <LineupPitch
              players={homeLineup.players}
              teamName={fixture.homeTeam.name}
              side="home"
            />
            <BenchList lineup={homeLineup} />
          </div>
        ) : null}
        {awayLineup ? (
          <div className="space-y-4">
            <LineupPitch
              players={awayLineup.players}
              teamName={fixture.awayTeam.name}
              side="away"
            />
            <BenchList lineup={awayLineup} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
