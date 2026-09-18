import type { Metadata } from "next";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PredictionsCenterLocked } from "@/components/predictions/PredictionsCenterLocked";
import { PredictionsPickCard } from "@/components/predictions/PredictionsPickCard";
import { PredictionsViewAnalytics } from "@/components/predictions/PredictionsViewAnalytics";
import { getTopPicksOfTheDay } from "@/lib/predictions/top-picks";
import { getAuthUserViewForSession } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Predictions",
  description:
    "Top 10 high-confidence picks of the day — ranked transparently with model probabilities.",
};

export default async function PredictionsPage() {
  const user = await getAuthUserViewForSession();
  const isGuest = !user;

  if (isGuest) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <header className="w-full space-y-2 text-center sm:text-left">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Predictions Center
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            High-confidence picks for today&apos;s allowlist fixtures, ranked by
            model probability, confidence, and data quality.
          </p>
        </header>
        <PredictionsCenterLocked returnTo="/predictions" />
        <PredictionsViewAnalytics isGuest pickCount={0} />
      </div>
    );
  }

  let picksResult;
  try {
    picksResult = await getTopPicksOfTheDay();
  } catch {
    return (
      <div className="w-full max-w-2xl">
        <EmptyState
          icon={SparklesIcon}
          title="Could not load picks"
          description="Something went wrong while loading today's predictions. Try again in a moment."
          actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
        />
      </div>
    );
  }

  const { picks, utcDate } = picksResult;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <PredictionsViewAnalytics isGuest={false} pickCount={picks.length} />
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Predictions Center
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Top high-confidence picks for{" "}
          <span className="font-mono tabular-nums">{utcDate}</span> (UTC).
          Ranked by model probability × confidence × data quality.{" "}
          <Link
            href="/methodology"
            className="text-primary underline-offset-4 hover:underline"
          >
            How ranking works
          </Link>
        </p>
      </header>

      {picks.length === 0 ? (
        <EmptyState
          icon={SparklesIcon}
          title="No picks meet today's thresholds"
          description="When upcoming fixtures have strong enough model signals, they'll appear here. Lower thresholds via TOP_PICKS_* env vars in development."
          actions={[
            { label: "Browse fixtures", href: "/fixtures" },
            {
              label: "Read methodology",
              href: "/methodology",
              variant: "outline",
            },
          ]}
        />
      ) : (
        <ol className="space-y-4">
          {picks.map((pick, index) => (
            <li key={pick.fixtureUuid}>
              <PredictionsPickCard pick={pick} rank={index + 1} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
