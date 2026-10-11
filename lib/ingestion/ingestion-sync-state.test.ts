import { describe, expect, it, vi } from "vitest";

import { reconcileStuckIngestionSyncRuns } from "@/lib/ingestion/ingestion-sync-state";

describe("reconcileStuckIngestionSyncRuns", () => {
  it("marks long-running sync runs as failed zombies", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ id: "run-1" }, { id: "run-2" }],
      error: null,
    });
    const lt = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ lt });
    const update = vi.fn().mockReturnValue({ eq });

    const client = {
      from: vi.fn().mockReturnValue({ update }),
    } as never;

    const result = await reconcileStuckIngestionSyncRuns({
      staleAfterMs: 3_600_000,
      client,
    });

    expect(result.reconciledCount).toBe(2);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "zombie_reconciled",
      })
    );
    expect(eq).toHaveBeenCalledWith("status", "running");
    expect(lt).toHaveBeenCalledWith("started_at", expect.any(String));
  });
});
