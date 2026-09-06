import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiLimitReachedError, assertCanGenerateAi } from "@/lib/ai/usage-gate";

vi.mock("@/lib/ai/db", () => ({
  readAiUsage: vi.fn(),
  incrementAiUsage: vi.fn(),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getFreeTierAiPredictionsPerDay: () => 5,
  };
});

import { readAiUsage } from "@/lib/ai/db";

describe("usage gate", () => {
  beforeEach(() => {
    vi.mocked(readAiUsage).mockReset();
  });

  it("allows generation below the daily cap", async () => {
    vi.mocked(readAiUsage).mockResolvedValue(4);
    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
  });

  it("blocks the sixth generation when cap is five", async () => {
    vi.mocked(readAiUsage).mockResolvedValue(5);

    await expect(assertCanGenerateAi("user-1")).rejects.toBeInstanceOf(
      AiLimitReachedError
    );
  });
});
