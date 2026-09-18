import type { RawApiFootballInjury } from "@/lib/api-football/types";
import type {
  FixtureSidelinedKind,
  FixtureSidelinedPlayer,
} from "@/types/domain";

const SUSPENSION_PATTERN =
  /suspend|suspension|ban|banned|red card|dismissed|disciplinary/i;
const INJURY_PATTERN =
  /injury|injured|muscle|knee|hamstring|ankle|groin|illness|fitness|back|shoulder|concussion|fracture|tear|strain|surgery|virus|flu|cold/i;

export function classifySidelinedKind(
  type: string | null | undefined,
  reason: string | null | undefined
): FixtureSidelinedKind {
  const combined = `${type ?? ""} ${reason ?? ""}`.trim();
  if (!combined) {
    return "other";
  }
  if (SUSPENSION_PATTERN.test(combined)) {
    return "suspension";
  }
  if (INJURY_PATTERN.test(combined)) {
    return "injury";
  }
  if (/missing fixture/i.test(type ?? "")) {
    return "injury";
  }
  return "other";
}

export function mapFixtureSidelined(
  raw: RawApiFootballInjury
): FixtureSidelinedPlayer {
  return {
    teamExternalId: raw.team.id,
    playerExternalId: raw.player.id,
    name: raw.player.name,
    kind: classifySidelinedKind(raw.player.type, raw.player.reason),
    reason: raw.player.reason ?? raw.player.type ?? null,
  };
}
