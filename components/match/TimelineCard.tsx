"use client";

import { TimerIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import type { Fixture } from "@/types/domain";
import {
  formatEventMinute,
  getFixtureEventPresentation,
} from "@/lib/fixtures/events";
import { timelineEventKey } from "@/lib/fixtures/timeline-event-key";
import {
  MOTION_DURATION,
  motionTransition,
  usePrefersReducedMotion,
} from "@/lib/motion";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { Separator } from "@/components/ui/separator";
import type { FixtureEvent } from "@/types/domain";

type TimelineCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  events: FixtureEvent[];
};

export function TimelineCard({ fixture, events }: TimelineCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (events.length === 0) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Timeline</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="timeline"
            fixture={fixture}
            icon={TimerIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <MatchCardTitle>Timeline</MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent>
        <motion.ul className="space-y-3" initial={false}>
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const presentation = getFixtureEventPresentation(
                event.type,
                event.detail
              );
              const Icon = presentation.icon;
              const key = timelineEventKey(event);

              return (
                <motion.li
                  key={key}
                  layout
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={motionTransition(prefersReducedMotion, {
                    duration: MOTION_DURATION.fast,
                  })}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-muted text-muted-foreground min-w-12 rounded-md px-2 py-1 text-center font-mono text-xs tabular-nums">
                      {formatEventMinute(event.minute, event.extraMinute)}
                    </span>
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Icon
                        aria-hidden="true"
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {presentation.label}
                        </p>
                        {event.comments ? (
                          <p className="text-muted-foreground text-xs">
                            {event.comments}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Separator />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
