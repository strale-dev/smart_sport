import Link from "next/link";
import {
  AwardIcon,
  CircleDotIcon,
  ShieldCheckIcon,
  SquareIcon,
  TargetIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PlayerContributionBadge } from "@/types/domain";

type PlayerContributionBadgesProps = {
  badges: PlayerContributionBadge[];
};

export function PlayerContributionBadges({
  badges,
}: PlayerContributionBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge, index) => (
        <Badge
          key={`${badge.type}-${badge.minute ?? "na"}-${index}`}
          variant="secondary"
          className="gap-1 px-1.5 text-[11px]"
        >
          {renderBadgeIcon(badge.type)}
          {formatBadgeLabel(badge)}
        </Badge>
      ))}
    </div>
  );
}

function renderBadgeIcon(type: PlayerContributionBadge["type"]) {
  switch (type) {
    case "goal":
      return <TargetIcon className="size-3" aria-hidden="true" />;
    case "assist":
      return <CircleDotIcon className="size-3" aria-hidden="true" />;
    case "clean_sheet":
      return <ShieldCheckIcon className="size-3" aria-hidden="true" />;
    case "motm":
      return <AwardIcon className="size-3" aria-hidden="true" />;
    case "yellow_card":
      return (
        <SquareIcon
          className="size-3 fill-yellow-400 text-yellow-400"
          aria-hidden="true"
        />
      );
    case "red_card":
      return (
        <SquareIcon
          className="size-3 fill-red-500 text-red-500"
          aria-hidden="true"
        />
      );
    default:
      return null;
  }
}

function formatBadgeLabel(badge: PlayerContributionBadge): string {
  const minuteSuffix = badge.minute != null ? ` ${badge.minute}'` : "";

  switch (badge.type) {
    case "goal":
      return `Goal${minuteSuffix}`;
    case "assist":
      return `Assist${minuteSuffix}`;
    case "clean_sheet":
      return "Clean sheet";
    case "motm":
      return "Top rated";
    case "yellow_card":
      return `Yellow${minuteSuffix}`;
    case "red_card":
      return `Red${minuteSuffix}`;
    default:
      return "Event";
  }
}

export function PlayerMatchMeta({
  minutes,
  rating,
}: {
  minutes: number | null;
  rating: number | null;
}) {
  const parts = [
    minutes != null ? `${minutes}'` : null,
    rating != null ? rating.toFixed(1) : null,
  ].filter((value): value is string => value != null);

  if (parts.length === 0) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-xs tabular-nums">
      {parts.join(" · ")}
    </p>
  );
}

export function PlayerMatchOpponentLink({
  opponentName,
  opponentId,
  isHome,
}: {
  opponentName: string;
  opponentId: number;
  isHome: boolean;
}) {
  return (
    <Link
      href={`/teams/${opponentId}`}
      className="text-sm font-medium hover:underline"
    >
      {isHome ? "vs" : "@"} {opponentName}
    </Link>
  );
}
