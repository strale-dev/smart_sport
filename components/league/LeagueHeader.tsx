"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildLeagueHref } from "@/lib/leagues/url";
import { parseLeagueTab } from "@/lib/leagues/url";
import type { ReactNode } from "react";

import type { League, Season } from "@/types/domain";

type LeagueHeaderProps = {
  league: League;
  seasons: Season[];
  seasonYear: number | null;
  followControl?: ReactNode;
};

export function LeagueHeader({
  league,
  seasons,
  seasonYear,
  followControl,
}: LeagueHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseLeagueTab(searchParams.get("tab") ?? undefined);

  function handleSeasonChange(value: string | null) {
    if (!value) {
      return;
    }

    const nextSeason = Number.parseInt(value, 10);

    if (!Number.isFinite(nextSeason)) {
      return;
    }

    router.replace(
      buildLeagueHref(league.externalId, {
        tab: activeTab,
        season: nextSeason,
      }),
      { scroll: false }
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {league.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={league.logoUrl}
                alt=""
                className="size-14 object-contain"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0 space-y-1">
              <CardTitle className="font-heading text-xl sm:text-2xl">
                {league.name}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                {league.country?.name ? (
                  <span>{league.country.name}</span>
                ) : null}
                {league.type ? (
                  <Badge variant="outline">{league.type}</Badge>
                ) : null}
              </CardDescription>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {followControl ? (
              <div className="shrink-0">{followControl}</div>
            ) : null}
            {seasons.length > 0 ? (
              <Select
                value={seasonYear != null ? String(seasonYear) : undefined}
                onValueChange={handleSeasonChange}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.year} value={String(season.year)}>
                      {season.year}
                      {season.isCurrent ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
