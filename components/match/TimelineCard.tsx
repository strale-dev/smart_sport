"use client";

import { TimerIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/common/EmptyState";
import {
  formatEventMinute,
  getFixtureEventPresentation,
} from "@/lib/fixtures/events";
import { timelineEventKey } from "@/lib/fixtures/timeline-event-key";
import { motionTransition, usePrefersReducedMotion } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FixtureEvent } from "@/types/domain";

type TimelineCardProps = {
  events: FixtureEvent[];
};

export function TimelineCard({ events }: TimelineCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (events.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TimerIcon}
            title="No events yet"
            description="Goals, cards, and substitutions will appear here as they happen."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
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
                    duration: 0.25,
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
      </CardContent>
    </Card>
  );
}
