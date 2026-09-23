import { getServerEnv } from "@/lib/env.server";

function parseInternalAdminUserIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

export function getInternalAdminUserIds(): Set<string> {
  const env = getServerEnv() as { INTERNAL_ADMIN_USER_IDS?: string };
  return parseInternalAdminUserIds(env.INTERNAL_ADMIN_USER_IDS);
}

export function isInternalAdmin(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }

  return getInternalAdminUserIds().has(userId);
}
