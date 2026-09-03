import { ClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Fixture } from "@/types/domain";

type PlayersToWatchCardProps = {
  fixture: Fixture;
};

const PLACEHOLDER_SLOTS = [
  "Key attacker impact",
  "Midfield control",
  "Defensive anchor",
];

export function PlayersToWatchCard({ fixture }: PlayersToWatchCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">
            Players to watch
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <ClockIcon aria-hidden="true" className="size-3" />
            Phase 4
          </Badge>
        </div>
        <CardDescription>
          Player impact scoring for {fixture.homeTeam.name} vs{" "}
          {fixture.awayTeam.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLACEHOLDER_SLOTS.map((slot) => (
          <div
            key={slot}
            className="border-border/70 bg-muted/20 rounded-xl border px-4 py-3"
          >
            <p className="text-sm font-medium">{slot}</p>
            <p className="text-muted-foreground text-xs">
              Real player impact ratings arrive with the prediction engine.
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
