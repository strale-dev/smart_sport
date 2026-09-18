import { ClockIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import type { Fixture } from "@/types/domain";

type LiveUpcomingSectionProps = {
  upcomingSoon: Fixture[];
};

export function LiveUpcomingSection({
  upcomingSoon,
}: LiveUpcomingSectionProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="border-border/60 bg-muted/15 flex min-h-[min(42vh,320px)] w-full items-center justify-center rounded-xl border border-dashed px-4 py-10 sm:min-h-[280px]">
        <EmptyState
          icon={ClockIcon}
          title="No live matches right now"
          description="Check back when matches kick off, or browse fixtures starting soon."
          className="mx-auto w-full max-w-md py-0"
          actions={[
            { label: "Browse fixtures", href: "/fixtures" },
            { label: "Open Live Center", href: "/live", variant: "outline" },
          ]}
        />
      </div>

      {upcomingSoon.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-heading text-base font-medium">
              Starting soon
            </h2>
            <p className="text-muted-foreground text-sm">
              Matches kicking off in the next few hours.
            </p>
          </div>
          <div className="space-y-2">
            {upcomingSoon.map((fixture) => (
              <MatchRow key={fixture.externalId} fixture={fixture} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
