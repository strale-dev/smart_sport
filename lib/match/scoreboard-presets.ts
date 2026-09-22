import { MATCH_HEADER_LOGO_SIZES } from "@/lib/images/logo-dimensions";

export type MatchScoreboardVariant = "row" | "header";

export type MatchScoreboardPreset = {
  linkTeams: boolean;
  showHalftimeLine: boolean;
  animateScore: boolean;
  truncateTeamNames: boolean;
  scheduledCenterVariant: "badge" | "text";
  scoreClassName: string;
  scheduledKickoffClassName?: string;
  logoClassName?: string;
  logoSizes?: string;
  logoPriority: boolean;
  teamNameClassName: string;
  teamLinkClassName: string;
  className?: string;
  centerColumnClassName?: string;
};

const rowPreset: MatchScoreboardPreset = {
  linkTeams: false,
  showHalftimeLine: false,
  animateScore: false,
  truncateTeamNames: true,
  scheduledCenterVariant: "badge",
  scoreClassName: "text-lg",
  logoPriority: false,
  teamNameClassName: "text-sm font-medium",
  teamLinkClassName:
    "hover:bg-muted/40 focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
};

const headerPreset: MatchScoreboardPreset = {
  linkTeams: true,
  showHalftimeLine: true,
  animateScore: true,
  truncateTeamNames: false,
  scheduledCenterVariant: "badge",
  scoreClassName: "text-xl sm:text-4xl",
  scheduledKickoffClassName:
    "px-3 py-1.5 text-base sm:px-3.5 sm:py-2 sm:text-lg",
  logoClassName: "size-8 sm:size-16",
  logoSizes: MATCH_HEADER_LOGO_SIZES,
  logoPriority: true,
  teamNameClassName: "text-sm font-semibold sm:text-xl md:text-2xl",
  teamLinkClassName:
    "hover:bg-muted/40 focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-xl p-1.5 transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:gap-2.5 sm:p-2",
  className:
    "max-w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 sm:gap-4",
  centerColumnClassName: "shrink-0 px-1 sm:px-2",
};

export function getMatchScoreboardPreset(
  variant: MatchScoreboardVariant
): MatchScoreboardPreset {
  return variant === "header" ? headerPreset : rowPreset;
}
