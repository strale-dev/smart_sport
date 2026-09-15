import { beforeEach, describe, expect, it, vi } from "vitest";

import { mergeAiUsageRows } from "@/lib/entitlements/merge-usage";
import { reconcileAiUsageForDay } from "@/lib/entitlements/reconcile-ai-usage";

const mocks = vi.hoisted(() => ({
  listActiveUsageUserIds: vi.fn(),
  readRedisUsageRow: vi.fn(),
  readPostgresUsageRow: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/entitlements/redis-usage", () => ({
  listActiveUsageUserIds: mocks.listActiveUsageUserIds,
  readRedisUsageRow: mocks.readRedisUsageRow,
  rowToMergePayload: (row: {
    ai_predictions_count: number;
    ai_deep_analyses_count: number;
    ai_generations_count: number;
    live_ai_matches: string[];
    last_live_ai_at: Record<string, string>;
  }) => ({
    predictions: row.ai_predictions_count,
    deepAnalyses: row.ai_deep_analyses_count,
    generations: row.ai_generations_count,
    liveMatches: row.live_ai_matches,
    lastLiveAt: row.last_live_ai_at,
  }),
}));

vi.mock("@/lib/entitlements/usage", () => ({
  readPostgresUsageRow: mocks.readPostgresUsageRow,
  getUtcUsageDay: () => "2026-09-15",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
  }),
}));

describe("reconcileAiUsageForDay", () => {
  beforeEach(() => {
    mocks.listActiveUsageUserIds.mockReset();
    mocks.readRedisUsageRow.mockReset();
    mocks.readPostgresUsageRow.mockReset();
    mocks.rpc.mockReset();
  });

  it("max-merges when Redis counter is higher than Postgres", async () => {
    mocks.listActiveUsageUserIds.mockResolvedValue(["user-1"]);
    mocks.readRedisUsageRow.mockResolvedValue({
      ai_predictions_count: 8,
      ai_deep_analyses_count: 0,
      ai_generations_count: 8,
      live_ai_matches: [],
      last_live_ai_at: {},
    });
    mocks.readPostgresUsageRow.mockResolvedValue({
      ai_predictions_count: 3,
      ai_deep_analyses_count: 0,
      ai_generations_count: 3,
      live_ai_matches: [],
      last_live_ai_at: {},
    });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });

    const result = await reconcileAiUsageForDay("2026-09-15");

    expect(result.mergedUsers).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "merge_ai_usage_from_redis",
      expect.objectContaining({
        p_user_id: "user-1",
        p_predictions: 8,
        p_generations: 8,
      })
    );
  });

  it("max-merges when Postgres counter is higher than Redis", async () => {
    mocks.listActiveUsageUserIds.mockResolvedValue(["user-2"]);
    mocks.readRedisUsageRow.mockResolvedValue({
      ai_predictions_count: 2,
      ai_deep_analyses_count: 0,
      ai_generations_count: 2,
      live_ai_matches: ["fixture-a"],
      last_live_ai_at: {},
    });
    mocks.readPostgresUsageRow.mockResolvedValue({
      ai_predictions_count: 5,
      ai_deep_analyses_count: 1,
      ai_generations_count: 6,
      live_ai_matches: ["fixture-b"],
      last_live_ai_at: { "fixture-b": "2026-09-15T10:00:00.000Z" },
    });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });

    await reconcileAiUsageForDay("2026-09-15");

    const merged = mergeAiUsageRows(
      {
        ai_predictions_count: 5,
        ai_deep_analyses_count: 1,
        ai_generations_count: 6,
        live_ai_matches: ["fixture-b"],
        last_live_ai_at: { "fixture-b": "2026-09-15T10:00:00.000Z" },
      },
      {
        ai_predictions_count: 2,
        ai_deep_analyses_count: 0,
        ai_generations_count: 2,
        live_ai_matches: ["fixture-a"],
        last_live_ai_at: {},
      }
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      "merge_ai_usage_from_redis",
      expect.objectContaining({
        p_predictions: merged.ai_predictions_count,
        p_deep_analyses: merged.ai_deep_analyses_count,
        p_generations: merged.ai_generations_count,
        p_live_ai_matches: expect.arrayContaining(["fixture-a", "fixture-b"]),
      })
    );
  });

  it("read path after reconcile uses max-merge of PG and Redis (readAiUsageRow contract)", async () => {
    const pgAfterReconcile = {
      ai_predictions_count: 8,
      ai_deep_analyses_count: 0,
      ai_generations_count: 8,
      live_ai_matches: [] as string[],
      last_live_ai_at: {},
    };
    const redisHot = {
      ai_predictions_count: 5,
      ai_deep_analyses_count: 0,
      ai_generations_count: 5,
      live_ai_matches: [] as string[],
      last_live_ai_at: {},
    };

    const readView = mergeAiUsageRows(pgAfterReconcile, redisHot);
    expect(readView.ai_predictions_count).toBe(8);
    expect(readView.ai_generations_count).toBe(8);
  });
});
