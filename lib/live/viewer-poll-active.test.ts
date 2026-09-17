import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/live/viewers", () => ({
  countMatchWatchers: vi.fn(),
  shouldKeepMatchPollRunning: vi.fn(),
}));

vi.mock("@/lib/redis/lock", () => ({
  isLockHeld: vi.fn(),
}));

import { isViewerPollActiveForFixture } from "@/lib/live/viewer-poll-active";
import {
  countMatchWatchers,
  shouldKeepMatchPollRunning,
} from "@/lib/live/viewers";
import { isLockHeld } from "@/lib/redis/lock";

describe("isViewerPollActiveForFixture", () => {
  beforeEach(() => {
    vi.mocked(countMatchWatchers).mockReset();
    vi.mocked(shouldKeepMatchPollRunning).mockReset();
    vi.mocked(isLockHeld).mockReset();
  });

  it("returns true when match watchers exist", async () => {
    vi.mocked(countMatchWatchers).mockResolvedValue(2);
    await expect(isViewerPollActiveForFixture(1)).resolves.toBe(true);
  });

  it("returns true when poll should keep running", async () => {
    vi.mocked(countMatchWatchers).mockResolvedValue(0);
    vi.mocked(shouldKeepMatchPollRunning).mockResolvedValue(true);
    await expect(isViewerPollActiveForFixture(1)).resolves.toBe(true);
  });

  it("returns true when viewer poll lock is held", async () => {
    vi.mocked(countMatchWatchers).mockResolvedValue(0);
    vi.mocked(shouldKeepMatchPollRunning).mockResolvedValue(false);
    vi.mocked(isLockHeld).mockResolvedValue(true);
    await expect(isViewerPollActiveForFixture(1)).resolves.toBe(true);
  });

  it("returns false when no viewer poll signals", async () => {
    vi.mocked(countMatchWatchers).mockResolvedValue(0);
    vi.mocked(shouldKeepMatchPollRunning).mockResolvedValue(false);
    vi.mocked(isLockHeld).mockResolvedValue(false);
    await expect(isViewerPollActiveForFixture(1)).resolves.toBe(false);
  });
});
