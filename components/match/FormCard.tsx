"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type { FormSnapshot } from "@/types/domain";
import { TrendingUpIcon } from "lucide-react";

type FormCardProps = {
  homeTeamName: string;
  awayTeamName: string;
  homeForm5: FormSnapshot;
  homeForm10: FormSnapshot;
  awayForm5: FormSnapshot;
  awayForm10: FormSnapshot;
};

function resultVariant(result: "W" | "D" | "L") {
  switch (result) {
    case "W":
      return "default" as const;
    case "D":
      return "secondary" as const;
    case "L":
      return "outline" as const;
  }
}

function TeamFormPanel({
  teamName,
  form5,
  form10,
  matchCount,
}: {
  teamName: string;
  form5: FormSnapshot;
  form10: FormSnapshot;
  matchCount: 5 | 10;
}) {
  const form = matchCount === 5 ? form5 : form10;

  if (form.results.length === 0) {
    return (
      <EmptyState
        icon={TrendingUpIcon}
        title={`No recent form for ${teamName}`}
        description="Finished matches will populate this section."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {form.results.map((entry) => (
          <Badge
            key={entry.fixtureExternalId}
            variant={resultVariant(entry.result)}
          >
            {entry.result}
          </Badge>
        ))}
      </div>
      <div className="text-muted-foreground grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.wins}
          </p>
          <p>Wins</p>
        </div>
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.draws}
          </p>
          <p>Draws</p>
        </div>
        <div>
          <p className="text-foreground font-mono text-lg tabular-nums">
            {form.losses}
          </p>
          <p>Losses</p>
        </div>
      </div>
      <div className="space-y-2">
        {form.results.map((entry) => (
          <div
            key={`${entry.fixtureExternalId}-row`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              {entry.isHome ? "vs" : "@"} {entry.opponentName}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatFixtureKickoffDateTime(entry.kickoffAt)}
            </span>
            <span className="font-mono tabular-nums">
              {entry.goalsFor}-{entry.goalsAgainst}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormCard({
  homeTeamName,
  awayTeamName,
  homeForm5,
  homeForm10,
  awayForm5,
  awayForm10,
}: FormCardProps) {
  const [matchCount, setMatchCount] = useState<5 | 10>(10);

  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">Recent form</CardTitle>
          <Tabs
            value={String(matchCount)}
            onValueChange={(value) => setMatchCount(Number(value) as 5 | 10)}
          >
            <TabsList>
              <TabsTrigger value="5">Last 5</TabsTrigger>
              <TabsTrigger value="10">Last 10</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>All competitions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{homeTeamName}</h3>
          <TeamFormPanel
            teamName={homeTeamName}
            form5={homeForm5}
            form10={homeForm10}
            matchCount={matchCount}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{awayTeamName}</h3>
          <TeamFormPanel
            teamName={awayTeamName}
            form5={awayForm5}
            form10={awayForm10}
            matchCount={matchCount}
          />
        </div>
      </CardContent>
    </Card>
  );
}
