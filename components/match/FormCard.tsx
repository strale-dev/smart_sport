"use client";

import { useState } from "react";

import { TeamFormPanel } from "@/components/match/TeamFormPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormSnapshot } from "@/types/domain";

type FormCardProps = {
  homeTeamName: string;
  awayTeamName: string;
  homeForm5: FormSnapshot;
  homeForm10: FormSnapshot;
  awayForm5: FormSnapshot;
  awayForm10: FormSnapshot;
};

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
