import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRightIcon,
  CircleDotIcon,
  FlagIcon,
  GoalIcon,
  ShieldAlertIcon,
  TimerIcon,
  XCircleIcon,
} from "lucide-react";

export type FixtureEventPresentation = {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
};

export function getFixtureEventPresentation(
  type: string,
  detail: string | null
): FixtureEventPresentation {
  const normalizedType = type.toLowerCase();
  const normalizedDetail = detail?.toLowerCase() ?? "";

  if (normalizedType.includes("goal")) {
    if (normalizedDetail.includes("own")) {
      return {
        label: "Own goal",
        icon: GoalIcon,
        iconClassName: "text-red-400",
      };
    }
    if (normalizedDetail.includes("missed")) {
      return {
        label: "Missed penalty",
        icon: XCircleIcon,
        iconClassName: "text-muted-foreground",
      };
    }
    if (normalizedDetail.includes("penalty")) {
      return {
        label: "Penalty goal",
        icon: GoalIcon,
        iconClassName: "text-emerald-500",
      };
    }
    return {
      label: "Goal",
      icon: CircleDotIcon,
      iconClassName: "text-emerald-500",
    };
  }

  if (normalizedType.includes("card")) {
    if (
      normalizedDetail.includes("red") ||
      normalizedDetail.includes("second yellow")
    ) {
      return {
        label: detail ?? "Red card",
        icon: ShieldAlertIcon,
        iconClassName: "text-red-500",
      };
    }
    return {
      label: detail ?? "Yellow card",
      icon: ShieldAlertIcon,
      iconClassName: "text-amber-400",
    };
  }

  if (normalizedType.includes("subst")) {
    return { label: detail ?? "Substitution", icon: ArrowLeftRightIcon };
  }

  if (normalizedType.includes("var")) {
    return { label: detail ?? "VAR", icon: FlagIcon };
  }

  return { label: detail ?? type, icon: TimerIcon };
}

export function formatEventMinute(minute: number, extraMinute: number | null) {
  if (extraMinute != null) {
    return `${minute}+${extraMinute}'`;
  }

  return `${minute}'`;
}

export function formatTimelinePrimaryLine(input: {
  type: string;
  detail: string | null;
  playerName: string | null;
}): string {
  const presentation = getFixtureEventPresentation(input.type, input.detail);
  const normalizedType = input.type.toLowerCase();

  if (input.playerName?.trim()) {
    if (normalizedType.includes("goal")) {
      return input.playerName.trim();
    }
    if (normalizedType.includes("card") || normalizedType.includes("subst")) {
      return input.playerName.trim();
    }
  }

  return presentation.label;
}
