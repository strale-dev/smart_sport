import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getCurrentUser } from "@/lib/supabase/user";
import { updateSoundPreferences } from "@/lib/preferences/sound.actions";

describe("updateSoundPreferences", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("requires sign in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(
      updateSoundPreferences({ soundGoalEnabled: true })
    ).resolves.toEqual({ ok: false, code: "SIGN_IN_REQUIRED" });
  });

  it("updates when authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);
    await expect(
      updateSoundPreferences({ soundGoalEnabled: true })
    ).resolves.toEqual({ ok: true });
  });
});
