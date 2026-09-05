"use client";

import Link from "next/link";
import { TargetIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaguePlayerLeaderboardRow } from "@/types/domain";

type LeagueTopScorersTabProps = {
  topScorers: LeaguePlayerLeaderboardRow[];
  topAssists: LeaguePlayerLeaderboardRow[];
};

function LeaderboardTable({
  rows,
  metric,
}: {
  rows: LeaguePlayerLeaderboardRow[];
  metric: "goals" | "assists";
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={TargetIcon}
        title={`No ${metric} data`}
        description="Leaderboard data is not available for this season yet."
      />
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="overflow-x-auto pt-6">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="pr-3 pb-2 font-medium">#</th>
              <th className="pr-3 pb-2 font-medium">Player</th>
              <th className="pr-3 pb-2 font-medium">Team</th>
              <th className="pr-3 pb-2 font-medium">Apps</th>
              <th className="pb-2 font-medium">
                {metric === "goals" ? "Goals" : "Assists"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.player.externalId}-${row.rank}`}
                className="border-b last:border-0"
              >
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {row.rank}
                </td>
                <td className="py-2.5 pr-3">
                  <Link
                    href={`/players/${row.player.externalId}`}
                    className="font-medium transition-colors hover:underline"
                  >
                    {row.player.fullName}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">
                  <Link
                    href={`/teams/${row.team.externalId}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {row.team.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {row.appearances ?? "–"}
                </td>
                <td className="py-2.5 font-mono font-semibold tabular-nums">
                  {metric === "goals"
                    ? (row.goals ?? "–")
                    : (row.assists ?? "–")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function LeagueTopScorersTab({
  topScorers,
  topAssists,
}: LeagueTopScorersTabProps) {
  return (
    <Tabs defaultValue="scorers" className="w-full gap-4">
      <TabsList
        variant="line"
        className="border-border/70 w-full justify-start overflow-x-auto border-b pb-0"
      >
        <TabsTrigger value="scorers">Top scorers</TabsTrigger>
        <TabsTrigger value="assists">Top assists</TabsTrigger>
      </TabsList>

      <TabsContent value="scorers">
        <LeaderboardTable rows={topScorers} metric="goals" />
      </TabsContent>

      <TabsContent value="assists">
        <LeaderboardTable rows={topAssists} metric="assists" />
      </TabsContent>
    </Tabs>
  );
}
