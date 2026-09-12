"use client";

import { useEffect, useState } from "react";

const TICK_MS = 15_000;

/** Re-render on an interval so relative "Xs ago" labels stay fresh. */
export function useAiUpdatedTicker(isoTimestamp: string | null): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isoTimestamp) {
      return;
    }

    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [isoTimestamp]);

  return tick;
}
