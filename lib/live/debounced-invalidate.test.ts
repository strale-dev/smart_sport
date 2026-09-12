import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDebouncedQueryInvalidator,
  LIVE_INVALIDATE_DEBOUNCE_MS,
} from "@/lib/live/debounced-invalidate";

describe("createDebouncedQueryInvalidator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid invalidations into one wave", () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const schedule = createDebouncedQueryInvalidator(
      queryClient,
      LIVE_INVALIDATE_DEBOUNCE_MS
    );

    schedule([["live", "a"]]);
    schedule([["live", "b"]]);

    expect(invalidateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(LIVE_INVALIDATE_DEBOUNCE_MS);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });
});
