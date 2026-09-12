"use client";

import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

export const LIVE_INVALIDATE_DEBOUNCE_MS = 300;

function serializeQueryKey(key: QueryKey): string {
  return JSON.stringify(key);
}

export function createDebouncedQueryInvalidator(
  queryClient: QueryClient,
  delayMs = LIVE_INVALIDATE_DEBOUNCE_MS
): (keys: QueryKey[]) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Set<string>();

  return (keys: QueryKey[]) => {
    for (const key of keys) {
      pending.add(serializeQueryKey(key));
    }

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      for (const serialized of pending) {
        queryClient.invalidateQueries({
          queryKey: JSON.parse(serialized) as QueryKey,
        });
      }
      pending.clear();
      timer = null;
    }, delayMs);
  };
}

export function useDebouncedQueryInvalidator(
  delayMs = LIVE_INVALIDATE_DEBOUNCE_MS
): (keys: QueryKey[]) => void {
  const queryClient = useQueryClient();
  const invalidatorRef = useRef<((keys: QueryKey[]) => void) | null>(null);

  useEffect(() => {
    invalidatorRef.current = createDebouncedQueryInvalidator(
      queryClient,
      delayMs
    );
  }, [queryClient, delayMs]);

  return useCallback((keys: QueryKey[]) => {
    invalidatorRef.current?.(keys);
  }, []);
}
