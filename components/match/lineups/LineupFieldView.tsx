"use client";

import { LineupPitch } from "@/components/match/lineups/LineupPitch";
import { LineupSection } from "@/components/match/lineups/LineupSection";
import { LineupTeamHeader } from "@/components/match/lineups/LineupTeamHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { LineupFieldViewModel } from "@/lib/lineups/types";

type LineupFieldViewProps = {
  model: LineupFieldViewModel;
  variant?: "full" | "compact";
  showMatchBadges?: boolean;
};

function SplitPitchBoard({
  model,
  compact,
  showMatchBadges,
}: {
  model: LineupFieldViewModel;
  compact: boolean;
  showMatchBadges: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-2">
        {model.home ? <LineupTeamHeader team={model.home} /> : null}
        {model.away ? <LineupTeamHeader team={model.away} /> : null}
      </div>
      <LineupPitch
        home={model.home}
        away={model.away}
        layout="split"
        compact={compact}
        showMatchBadges={showMatchBadges}
      />
    </div>
  );
}

function MobileTeamPitch({
  model,
  compact,
  showMatchBadges,
}: {
  model: LineupFieldViewModel;
  compact: boolean;
  showMatchBadges: boolean;
}) {
  const defaultTab = model.home ? "home" : "away";

  return (
    <Tabs defaultValue={defaultTab} className="w-full gap-3">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="home" disabled={!model.home}>
          {model.home?.teamName ?? "Home"}
        </TabsTrigger>
        <TabsTrigger value="away" disabled={!model.away}>
          {model.away?.teamName ?? "Away"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="home" className="space-y-3">
        {model.home ? (
          <>
            <LineupTeamHeader team={model.home} />
            <LineupPitch
              home={model.home}
              away={null}
              layout="full"
              fullSide="home"
              compact={compact}
              showMatchBadges={showMatchBadges}
            />
          </>
        ) : null}
      </TabsContent>
      <TabsContent value="away" className="space-y-3">
        {model.away ? (
          <>
            <LineupTeamHeader team={model.away} />
            <LineupPitch
              home={null}
              away={model.away}
              layout="full"
              fullSide="away"
              compact={compact}
              showMatchBadges={showMatchBadges}
            />
          </>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

export function LineupFieldView({
  model,
  variant = "full",
  showMatchBadges = true,
}: LineupFieldViewProps) {
  const compact = variant === "compact";
  const isFull = variant === "full";

  return (
    <TooltipProvider delay={300}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">{model.statusLabel}</Badge>
          {!compact ? (
            <p className="text-muted-foreground text-sm">
              {model.home?.formation ?? "–"} vs {model.away?.formation ?? "–"}
            </p>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <SplitPitchBoard
            model={model}
            compact={compact}
            showMatchBadges={showMatchBadges}
          />
        </div>
        <div className="lg:hidden">
          <MobileTeamPitch
            model={model}
            compact={compact}
            showMatchBadges={showMatchBadges}
          />
        </div>

        {isFull ? (
          <div className="space-y-6">
            {model.home ? <LineupSection team={model.home} /> : null}
            {model.away ? <LineupSection team={model.away} /> : null}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
