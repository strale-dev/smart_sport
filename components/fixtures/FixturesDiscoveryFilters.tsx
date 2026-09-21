"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDistinctCountries } from "@/lib/competitions/index";
import {
  buildFixturesHref,
  type FixturesSearchParams,
} from "@/lib/fixtures/url";

type FixturesDiscoveryFiltersProps = {
  params: FixturesSearchParams;
};

function CompetitionSearchInput({
  params,
  navigate,
}: {
  params: FixturesSearchParams;
  navigate: (next: Partial<FixturesSearchParams>) => void;
}) {
  const [query, setQuery] = useState(params.q ?? "");

  return (
    <Input
      className="w-full sm:flex-1"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Search competition…"
      onKeyDown={(event) => {
        if (event.key !== "Enter") {
          return;
        }
        const value = query.trim();
        navigate({ q: value || undefined, league: undefined });
      }}
    />
  );
}

export function FixturesDiscoveryFilters({
  params,
}: FixturesDiscoveryFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const countries = listDistinctCountries();

  function navigate(next: Partial<FixturesSearchParams>) {
    startTransition(() => {
      router.push(buildFixturesHref(params, next));
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={params.country ?? "all"}
        onValueChange={(value) => {
          const selected = value ?? "all";
          navigate({
            country: selected === "all" ? undefined : selected,
            league: selected === "all" ? params.league : undefined,
            q: params.q,
          });
        }}
      >
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="All countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country.name} value={country.name}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CompetitionSearchInput
        key={params.q ?? ""}
        params={params}
        navigate={navigate}
      />
    </div>
  );
}
