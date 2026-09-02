"use client";

import { useEffect } from "react";

type FixturesNowAnchorProps = {
  fixtureId: number | null;
  todayDateKey?: string | null;
};

export function FixturesNowAnchor({
  fixtureId,
  todayDateKey,
}: FixturesNowAnchorProps) {
  useEffect(() => {
    if (fixtureId != null) {
      const element = document.getElementById(`fixture-${fixtureId}`);
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    if (todayDateKey != null) {
      const element = document.getElementById(`day-${todayDateKey}`);
      element?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [fixtureId, todayDateKey]);

  return null;
}
