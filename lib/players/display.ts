import type { PlayerFoot, PlayerPosition } from "@/types/domain";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: "Goalkeeper",
  DF: "Defender",
  MF: "Midfielder",
  FW: "Forward",
};

const FOOT_LABELS: Record<Exclude<PlayerFoot, "UNKNOWN">, string> = {
  LEFT: "Left",
  RIGHT: "Right",
  BOTH: "Both",
};

export function formatPlayerPosition(
  position: PlayerPosition | null
): string | null {
  if (!position) {
    return null;
  }

  return POSITION_LABELS[position];
}

export function formatPlayerFoot(foot: PlayerFoot): string | null {
  if (foot === "UNKNOWN") {
    return null;
  }

  return FOOT_LABELS[foot];
}

export function ageFromDateOfBirth(
  dateOfBirth: string | null,
  now = new Date()
): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 0 && age < 80 ? age : null;
}
