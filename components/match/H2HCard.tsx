"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type { H2HScope, H2HSummary } from "@/types/domain";
import { SwordsIcon } from "lucide-react";

type H2HCardProps = {
  homeTeamName: string;
  awayTeamName: string;
  h2hAll: H2HSummary;
  h2hSameComp: H2HSummary;
};

export function H2HCard({
  homeTeamName,
  awayTeamName,
  h2hAll,
  h2hSameComp,
}: H2HCardProps) {
  const [scope, setScope] = useState<H2HScope>("ALL");
  const summary = scope === "ALL" ? h2hAll : h2hSameComp;

  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">Head to head</CardTitle>
          <Tabs
            value={scope}
            onValueChange={(value) => setScope(value as H2HScope)}
          >
            <TabsList>
              <TabsTrigger value="ALL">All comps</TabsTrigger>
              <TabsTrigger value="SAME_COMP">Same league</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>
          Last {summary.windowSize} meetings between {homeTeamName} and{" "}
          {awayTeamName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.meetings.length === 0 ? (
          <EmptyState
            icon={SwordsIcon}
            title="No head-to-head history"
            description="These teams have no recorded meetings in this scope yet."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.teamAWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {homeTeamName} wins
                </p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.draws}
                </p>
                <p className="text-muted-foreground text-xs">Draws</p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.teamBWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {awayTeamName} wins
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {summary.meetings.map((meeting) => (
                <div
                  key={meeting.fixtureExternalId}
                  className="border-border/70 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {meeting.homeTeamName} vs {meeting.awayTeamName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatFixtureKickoffDateTime(meeting.kickoffAt)}
                      {meeting.leagueName ? ` · ${meeting.leagueName}` : ""}
                    </p>
                  </div>
                  <p className="font-mono tabular-nums">
                    {meeting.homeScore ?? "–"} - {meeting.awayScore ?? "–"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
