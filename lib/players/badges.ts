import type {
  FixtureEvent,
  PlayerContributionBadge,
  PlayerPosition,
} from "@/types/domain";

type BuildBadgesInput = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
  isMotm: boolean;
  events: FixtureEvent[];
  playerExternalId: number;
  position: PlayerPosition | null;
};

export function buildPlayerContributionBadges(
  input: BuildBadgesInput
): PlayerContributionBadge[] {
  const badges: PlayerContributionBadge[] = [];

  for (const event of input.events) {
    if (
      event.playerExternalId === input.playerExternalId &&
      isGoalEvent(event)
    ) {
      badges.push({ type: "goal", minute: event.minute });
    }

    if (
      event.assistPlayerExternalId === input.playerExternalId &&
      isGoalEvent(event)
    ) {
      badges.push({ type: "assist", minute: event.minute });
    }

    if (
      event.playerExternalId === input.playerExternalId &&
      event.type === "Card"
    ) {
      if (event.detail?.includes("Yellow")) {
        badges.push({ type: "yellow_card", minute: event.minute });
      }

      if (event.detail?.includes("Red")) {
        badges.push({ type: "red_card", minute: event.minute });
      }
    }
  }

  if (badges.length === 0) {
    for (let index = 0; index < input.goals; index += 1) {
      badges.push({ type: "goal", minute: null });
    }

    for (let index = 0; index < input.assists; index += 1) {
      badges.push({ type: "assist", minute: null });
    }

    for (let index = 0; index < input.yellowCards; index += 1) {
      badges.push({ type: "yellow_card", minute: null });
    }

    for (let index = 0; index < input.redCards; index += 1) {
      badges.push({ type: "red_card", minute: null });
    }
  }

  if (input.cleanSheet && isCleanSheetPosition(input.position)) {
    badges.push({ type: "clean_sheet", minute: null });
  }

  if (input.isMotm) {
    badges.push({ type: "motm", minute: null });
  }

  return badges;
}

function isGoalEvent(event: FixtureEvent): boolean {
  return event.type === "Goal" && !event.detail?.includes("Missed");
}

function isCleanSheetPosition(position: PlayerPosition | null): boolean {
  return position === "GK" || position === "DF";
}
