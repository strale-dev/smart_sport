"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SearchHitRow } from "@/components/search/SearchResultRows";
import type { GlobalSearchResponse, SearchHit } from "@/lib/search/types";
import { buildSearchHref } from "@/lib/search/url";

type SearchResultsPageProps = {
  data: GlobalSearchResponse;
};

function Section({ title, items }: { title: string; items: SearchHit[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="w-full min-w-0 space-y-2">
      <h2 className="font-heading text-sm font-semibold tracking-tight">
        {title}
      </h2>
      <div className="glass-card divide-border/60 divide-y rounded-xl border px-1 py-1">
        {items.map((hit) => (
          <SearchHitRow
            key={`${hit.type}-${hit.providerId}`}
            hit={hit}
            onSelect={() => router.push(hit.href)}
          />
        ))}
      </div>
    </section>
  );
}

export function SearchResultsPage({ data }: SearchResultsPageProps) {
  const query = data.query;
  const total =
    data.teams.total +
    data.players.total +
    data.leagues.total +
    data.matches.total;

  if (query.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        Enter at least 2 characters in{" "}
        <Link href={buildSearchHref("")} className="text-primary underline">
          search
        </Link>
        .
      </p>
    );
  }

  if (total === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No results for &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-2xl min-w-0 flex-col gap-8">
      <Section title="Teams" items={data.teams.items} />
      <Section title="Players" items={data.players.items} />
      <Section title="Competitions" items={data.leagues.items} />
      <Section title="Matches" items={data.matches.items} />
    </div>
  );
}
