"use client";

import dynamic from "next/dynamic";

import { ChartCardSkeleton } from "@/components/match/ChartCardSkeleton";

export const MatchMomentumCardLazy = dynamic(
  () =>
    import("@/components/match/MatchMomentumCard").then(
      (module) => module.MatchMomentumCard
    ),
  {
    loading: () => <ChartCardSkeleton title="Match momentum" />,
  }
);

export const TeamComparisonCardLazy = dynamic(
  () =>
    import("@/components/match/TeamComparisonCard").then(
      (module) => module.TeamComparisonCard
    ),
  {
    loading: () => <ChartCardSkeleton title="Team comparison" />,
  }
);
