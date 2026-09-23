"use client";

import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useGlobalSearch } from "@/components/search/GlobalSearchProvider";
import {
  SearchCategoryLink,
  SearchHitRow,
} from "@/components/search/SearchResultRows";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalSearchQuery } from "@/hooks/useGlobalSearchQuery";
import { MIN_SEARCH_QUERY_LENGTH } from "@/lib/search/normalize";
import type { GlobalSearchResponse, SearchHit } from "@/lib/search/types";
import { buildSearchHref } from "@/lib/search/url";
import { cn } from "@/lib/utils";

function flattenHits(data: GlobalSearchResponse | undefined): SearchHit[] {
  if (!data) {
    return [];
  }
  return [
    ...data.teams.items,
    ...data.players.items,
    ...data.leagues.items,
    ...data.matches.items,
  ];
}

function SearchPanelBody({
  query,
  setQuery,
  onNavigate,
}: {
  query: string;
  setQuery: (value: string) => void;
  onNavigate: (href: string) => void;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { open } = useGlobalSearch();
  const search = useGlobalSearchQuery(query, "palette", open);
  const [activeIndex, setActiveIndex] = useState(0);

  const hits = useMemo(() => flattenHits(search.data), [search.data]);
  const trimmed = query.trim();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search.data, trimmed]);

  const navigateHit = useCallback(
    (hit: SearchHit | null | undefined) => {
      if (hit) {
        onNavigate(hit.href);
        return;
      }
      if (trimmed.length >= MIN_SEARCH_QUERY_LENGTH) {
        onNavigate(buildSearchHref(trimmed));
      }
    },
    [onNavigate, trimmed]
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (hits.length === 0) {
        return;
      }
      setActiveIndex((index) => (index + 1) % hits.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (hits.length === 0) {
        return;
      }
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = hits[activeIndex] ?? search.data?.topHit ?? null;
      navigateHit(selected);
    }
  }

  let body: ReactNode;

  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) {
    body = (
      <p className="text-muted-foreground px-2 py-6 text-sm">
        Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search teams,
        players, leagues, and matches.
      </p>
    );
  } else if (search.isError) {
    body = (
      <div className="space-y-3 px-2 py-6">
        <p className="text-destructive text-sm">Search failed. Try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void search.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  } else if (search.isLoading && !search.data) {
    body = (
      <div className="space-y-2 px-2 py-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  } else if (hits.length === 0) {
    body = (
      <p className="text-muted-foreground px-2 py-6 text-sm">
        No results for &ldquo;{trimmed}&rdquo;.
      </p>
    );
  } else {
    const data = search.data!;
    let cursor = 0;

    function section(
      title: string,
      items: SearchHit[],
      hasMore: boolean
    ): ReactNode {
      if (items.length === 0) {
        return null;
      }
      const startIndex = cursor;
      cursor += items.length;
      return (
        <section className="min-w-0 space-y-1">
          <div className="flex items-center justify-between px-2 pt-2">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </h3>
            {hasMore ? (
              <SearchCategoryLink
                label="View all results"
                href={buildSearchHref(trimmed)}
              />
            ) : null}
          </div>
          {items.map((hit, offset) => (
            <SearchHitRow
              key={`${hit.type}-${hit.providerId}`}
              hit={hit}
              active={startIndex + offset === activeIndex}
              onSelect={() => onNavigate(hit.href)}
            />
          ))}
        </section>
      );
    }

    body = (
      <div className="min-w-0 space-y-2 pb-2">
        {section("Teams", data.teams.items, data.teams.hasMore)}
        {section("Players", data.players.items, data.players.hasMore)}
        {section("Competitions", data.leagues.items, data.leagues.hasMore)}
        {section("Matches", data.matches.items, data.matches.hasMore)}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search teams, players, leagues, matches…"
        aria-controls={listboxId}
        aria-autocomplete="list"
        role="combobox"
        aria-expanded={hits.length > 0}
        className="w-full min-w-0"
      />
      <ScrollArea className="max-h-[min(60vh,420px)] min-w-0">
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="min-w-0 pr-3"
        >
          {body}
        </div>
      </ScrollArea>
    </div>
  );
}

export function GlobalSearchTrigger({ className }: { className?: string }) {
  const { setOpen } = useGlobalSearch();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "bg-muted/40 text-muted-foreground hidden h-9 min-w-0 justify-start gap-2 md:inline-flex md:max-w-[220px] md:flex-1 lg:max-w-xs",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4 shrink-0 opacity-70" />
        <span className="truncate">Search…</span>
        <kbd className="bg-background/80 pointer-events-none ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>
    </>
  );
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function GlobalSearchDialog() {
  const router = useRouter();
  const { open, setOpen } = useGlobalSearch();
  const [query, setQuery] = useState("");
  const isDesktop = useIsDesktop();

  const onNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router, setOpen]
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery("");
      }
      setOpen(next);
    },
    [setOpen]
  );

  const panel = (
    <SearchPanelBody
      query={query}
      setQuery={setQuery}
      onNavigate={onNavigate}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-4 p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="flex max-h-[92dvh] min-w-0 flex-col gap-4 overflow-x-hidden px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Search</SheetTitle>
        </SheetHeader>
        {panel}
      </SheetContent>
    </Sheet>
  );
}
