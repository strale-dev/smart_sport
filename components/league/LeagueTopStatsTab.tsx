"use client";

import Link from "next/link";
import { BarChart3Icon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboardStatValue } from "@/lib/leagues/top-stats";
import type { LeagueStatLeaderboard } from "@/types/domain";

type LeagueTopStatsTabProps = {
  leaderboards: LeagueStatLeaderboard[];
};

function StatLeaderboardTable({ id, label, rows }: LeagueStatLeaderboard) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BarChart3Icon}
        title={`No ${label.toLowerCase()} data`}
        description="Statistics for this category are not available for this season yet."
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
              <th className="pb-2 font-medium">{label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${id}-${row.player.externalId}-${row.rank}`}
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
                  {getLeaderboardStatValue(row, id) ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function LeagueTopStatsTab({ leaderboards }: LeagueTopStatsTabProps) {
  if (leaderboards.length === 0) {
    return (
      <EmptyState
        icon={BarChart3Icon}
        title="Top stats unavailable"
        description="Player statistics are not available for this league and season yet."
      />
    );
  }

  const defaultCategory = leaderboards[0]?.id ?? "goals";

  return (
    <Tabs defaultValue={defaultCategory} className="w-full gap-4">
      <TabsList
        variant="line"
        className="border-border/70 w-full justify-start overflow-x-auto border-b pb-0"
      >
        {leaderboards.map((leaderboard) => (
          <TabsTrigger key={leaderboard.id} value={leaderboard.id}>
            {leaderboard.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {leaderboards.map((leaderboard) => (
        <TabsContent key={leaderboard.id} value={leaderboard.id}>
          <StatLeaderboardTable {...leaderboard} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
