"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchGlobalSearch } from "@/lib/search/fetch";
import { MIN_SEARCH_QUERY_LENGTH } from "@/lib/search/normalize";
import type { GlobalSearchMode } from "@/lib/search/types";

const DEBOUNCE_MS = 280;

export function useGlobalSearchQuery(
  query: string,
  mode: GlobalSearchMode,
  enabled: boolean
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  const canSearch = enabled && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;

  return useQuery({
    queryKey: ["global-search", mode, trimmed],
    queryFn: () => fetchGlobalSearch(trimmed, mode),
    enabled: canSearch,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
