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
import type { FormScope, FormSnapshot } from "@/types/domain";

type TeamFormCardProps = {
  teamName: string;
  form5All: FormSnapshot;
  form10All: FormSnapshot;
  form5Home: FormSnapshot;
  form10Home: FormSnapshot;
  form5Away: FormSnapshot;
  form10Away: FormSnapshot;
};

function formsForScope(
  scope: FormScope,
  props: TeamFormCardProps
): { form5: FormSnapshot; form10: FormSnapshot } {
  switch (scope) {
    case "HOME":
      return { form5: props.form5Home, form10: props.form10Home };
    case "AWAY":
      return { form5: props.form5Away, form10: props.form10Away };
    default:
      return { form5: props.form5All, form10: props.form10All };
  }
}

function scopeDescription(scope: FormScope): string {
  switch (scope) {
    case "HOME":
      return "Home matches only";
    case "AWAY":
      return "Away matches only";
    default:
      return "All competitions";
  }
}

export function TeamFormCard(props: TeamFormCardProps) {
  const { teamName } = props;
  const [matchCount, setMatchCount] = useState<5 | 10>(10);
  const [scope, setScope] = useState<FormScope>("ALL");
  const { form5, form10 } = formsForScope(scope, props);

  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">Current form</CardTitle>
          <Tabs
            value={String(matchCount)}
            onValueChange={(value) => {
              const next = Number(value) as 5 | 10;
              if (next !== matchCount) {
                setMatchCount(next);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="5">Last 5</TabsTrigger>
              <TabsTrigger value="10">Last 10</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardDescription>{scopeDescription(scope)}</CardDescription>
          <Tabs
            value={scope}
            onValueChange={(value) => {
              if (value !== scope) {
                setScope(value as FormScope);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="HOME">Home</TabsTrigger>
              <TabsTrigger value="AWAY">Away</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <TeamFormPanel
          teamName={teamName}
          form5={form5}
          form10={form10}
          matchCount={matchCount}
        />
      </CardContent>
    </Card>
  );
}
