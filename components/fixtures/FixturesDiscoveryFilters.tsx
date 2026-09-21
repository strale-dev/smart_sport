"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

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

      <Input
        className="w-full sm:flex-1"
        defaultValue={params.q ?? ""}
        placeholder="Search competition…"
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }
          const value = (event.currentTarget.value || "").trim();
          navigate({ q: value || undefined, league: undefined });
        }}
      />
    </div>
  );
}
