"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TeamGroupedMatchesList } from "@/components/team/TeamGroupedMatchesList";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { splitFixturesByStatus } from "@/lib/teams/matches";
import type { Fixture } from "@/types/domain";

type TeamFixturesExplorerProps = {
  teamProviderId: number;
  initialFixtures: Fixture[];
  seasonOptions: number[];
  leagueOptions: Array<{ providerId: number; name: string }>;
};

type FetchState = {
  fixtures: Fixture[];
  offset: number;
  hasMore: boolean;
  loading: boolean;
};

export function TeamFixturesExplorer({
  teamProviderId,
  initialFixtures,
  seasonOptions,
  leagueOptions,
}: TeamFixturesExplorerProps) {
  const [temporal, setTemporal] = useState<"all" | "past" | "upcoming">("all");
  const [seasonYear, setSeasonYear] = useState<string>("all");
  const [league, setLeague] = useState<string>("all");
  const [state, setState] = useState<FetchState>({
    fixtures: initialFixtures,
    offset: initialFixtures.length,
    hasMore: initialFixtures.length >= 50,
    loading: false,
  });

  const buildQuery = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: "50",
        offset: String(offset),
        temporal,
      });
      if (seasonYear !== "all") {
        params.set("season", seasonYear);
      }
      if (league !== "all") {
        params.set("league", league);
      }
      return params;
    },
    [temporal, seasonYear, league]
  );

  const filterKey = `${temporal}:${seasonYear}:${league}`;
  const skipInitialFilterFetch = useRef(true);

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const params = buildQuery(0);
    const response = await fetch(
      `/api/teams/${teamProviderId}/fixtures?${params.toString()}`
    );
    const payload = (await response.json()) as {
      fixtures: Fixture[];
      pagination: { count: number; limit: number };
    };
    const batch = payload.fixtures ?? [];
    setState({
      fixtures: batch,
      offset: batch.length,
      hasMore: batch.length >= (payload.pagination?.limit ?? 50),
      loading: false,
    });
  }, [buildQuery, teamProviderId]);

  useEffect(() => {
    if (skipInitialFilterFetch.current && filterKey === "all:all:all") {
      skipInitialFilterFetch.current = false;
      return;
    }
    skipInitialFilterFetch.current = false;
    void reload();
  }, [filterKey, reload]);

  const loadMore = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const params = buildQuery(state.offset);
    const response = await fetch(
      `/api/teams/${teamProviderId}/fixtures?${params.toString()}`
    );
    const payload = (await response.json()) as {
      fixtures: Fixture[];
      pagination: { count: number; limit: number };
    };
    const batch = payload.fixtures ?? [];
    setState((prev) => ({
      fixtures: [...prev.fixtures, ...batch],
      offset: prev.offset + batch.length,
      hasMore: batch.length >= (payload.pagination?.limit ?? 50),
      loading: false,
    }));
  }, [buildQuery, state.offset, teamProviderId]);

  const groups = useMemo(
    () => splitFixturesByStatus(state.fixtures),
    [state.fixtures]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={temporal}
          onValueChange={(value) => {
            if (!value) return;
            setTemporal(value as "all" | "past" | "upcoming");
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="When" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={seasonYear}
          onValueChange={(value) => {
            if (!value) return;
            setSeasonYear(value);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All seasons</SelectItem>
            {seasonOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}/{String(year + 1).slice(-2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {leagueOptions.length > 0 ? (
          <Select
            value={league}
            onValueChange={(value) => {
              if (!value) return;
              setLeague(value);
            }}
          >
            <SelectTrigger className="min-w-[160px]">
              <SelectValue placeholder="Competition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {leagueOptions.map((entry) => (
                <SelectItem
                  key={entry.providerId}
                  value={String(entry.providerId)}
                >
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <TeamGroupedMatchesList
        live={groups.live}
        upcoming={groups.upcoming}
        past={groups.past}
      />

      {state.hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={state.loading}
          onClick={() => void loadMore()}
        >
          {state.loading ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
