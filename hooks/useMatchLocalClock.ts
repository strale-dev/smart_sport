"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildMatchClockAnchorFromFixture,
  computeMatchClockDisplay,
} from "@/lib/live/match-clock";
import type { Fixture } from "@/types/domain";

const CLOCK_TICK_MS = 1_000;

function fixtureClockSyncKey(fixture: Fixture): string {
  const clock = fixture.liveClock;
  return [
    fixture.status,
    fixture.minute,
    clock?.statusExtraMinute,
    clock?.lastProviderSyncAt,
    clock?.periodFirstStartAt,
    clock?.periodSecondStartAt,
    fixture.score.home,
    fixture.score.away,
  ].join("|");
}

export function useMatchLocalClock(fixture: Fixture | null, isLive: boolean) {
  const syncKey = fixture && isLive ? fixtureClockSyncKey(fixture) : null;

  const anchor = useMemo(() => {
    if (!fixture || !isLive || !syncKey) {
      return null;
    }
    return buildMatchClockAnchorFromFixture(fixture);
  }, [fixture, isLive, syncKey]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!anchor) {
      return;
    }

    const display = computeMatchClockDisplay(anchor, Date.now());
    if (!display.shouldTick) {
      return;
    }

    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, CLOCK_TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [anchor, syncKey]);

  if (!anchor) {
    return null;
  }

  void tick;
  // Live display must reflect wall-clock between server syncs.
  // eslint-disable-next-line react-hooks/purity -- intentional wall clock read per tick/render
  return computeMatchClockDisplay(anchor, Date.now()).label;
}
