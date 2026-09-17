import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendEmail = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/emails/send", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/env.server", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://scorence.app" },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { sendWelcomeIfNeeded } from "@/lib/emails/send-welcome-if-needed";

describe("sendWelcomeIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("skips when email is not confirmed", async () => {
    const result = await sendWelcomeIfNeeded({
      userId: "u1",
      email: "a@b.com",
      emailConfirmedAt: null,
    });

    expect(result).toEqual({ sent: false, reason: "unconfirmed" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("skips when welcome was already sent", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              welcome_email_sent_at: "2026-01-01T00:00:00Z",
              display_name: "Alex",
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await sendWelcomeIfNeeded({
      userId: "u1",
      email: "a@b.com",
      emailConfirmedAt: "2026-01-02T00:00:00Z",
    });

    expect(result).toEqual({ sent: false, reason: "already_sent" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends once and marks profile", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== "profiles") {
        throw new Error(`unexpected table ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { welcome_email_sent_at: null, display_name: "Alex" },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: { id: "u1" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });

    const result = await sendWelcomeIfNeeded({
      userId: "u1",
      email: "a@b.com",
      emailConfirmedAt: "2026-01-02T00:00:00Z",
    });

    expect(result).toEqual({ sent: true });
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });
});
