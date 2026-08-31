import { isLineupsSyncEnabled } from "@/lib/ingestion/config";

export type SyncLineupsResult = {
  ok: boolean;
  job: string;
  skipped: boolean;
  reason: string;
};

export async function syncLineups(): Promise<SyncLineupsResult> {
  if (!isLineupsSyncEnabled()) {
    return {
      ok: true,
      job: "sync-lineups",
      skipped: true,
      reason:
        "Lineups cron is disabled in development. Enable after API-Football Pro key cutover.",
    };
  }

  return {
    ok: true,
    job: "sync-lineups",
    skipped: true,
    reason: "Lineups sync body is not implemented yet.",
  };
}
