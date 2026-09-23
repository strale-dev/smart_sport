import type { Metadata } from "next";

import { SearchResultsPage } from "@/components/search/SearchResultsPage";
import { globalSearch } from "@/lib/services/searchService";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const data = await globalSearch(q, "full");

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Search
        </h1>
        {data.query ? (
          <p className="text-muted-foreground text-sm">
            Results for &ldquo;{data.query}&rdquo;
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Find teams, players, competitions, and matches.
          </p>
        )}
      </header>

      <SearchResultsPage data={data} />
    </div>
  );
}
