import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRightIcon,
  CircleDotIcon,
  FlagIcon,
  ShieldAlertIcon,
  TimerIcon,
} from "lucide-react";

export type FixtureEventPresentation = {
  label: string;
  icon: LucideIcon;
};

export function getFixtureEventPresentation(
  type: string,
  detail: string | null
): FixtureEventPresentation {
  const normalizedType = type.toLowerCase();
  const normalizedDetail = detail?.toLowerCase() ?? "";

  if (normalizedType.includes("goal")) {
    return { label: detail ?? "Goal", icon: CircleDotIcon };
  }

  if (normalizedType.includes("card")) {
    if (normalizedDetail.includes("red")) {
      return { label: detail ?? "Red card", icon: ShieldAlertIcon };
    }
    return { label: detail ?? "Yellow card", icon: ShieldAlertIcon };
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
