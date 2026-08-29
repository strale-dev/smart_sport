import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToWaitlist } from "./service";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));
const mockSendEmail = vi.fn();
const mockCaptureWaitlistSignup = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/emails/send", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/posthog/server", () => ({
  captureWaitlistSignup: (...args: unknown[]) =>
    mockCaptureWaitlistSignup(...args),
}));

describe("subscribeToWaitlist", () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockFrom.mockClear();
    mockCreateAdminClient.mockClear();
    mockSendEmail.mockReset();
    mockCaptureWaitlistSignup.mockReset();
  });

  it("returns subscribed for a new email and triggers side effects", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSendEmail.mockResolvedValue(undefined);
    mockCaptureWaitlistSignup.mockResolvedValue(undefined);

    const result = await subscribeToWaitlist(
      {
        email: "new@example.com",
        source: "landing_hero",
      },
      "hashed-ip"
    );

    expect(result).toEqual({
      status: "subscribed",
      message: "You're on the list!",
      emailSent: true,
    });
    expect(mockFrom).toHaveBeenCalledWith("waitlist");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        source: "landing_hero",
        ip_hash: "hashed-ip",
        confirmed_at: expect.any(String),
      })
    );
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockCaptureWaitlistSignup).toHaveBeenCalledOnce();
  });

  it("returns already_subscribed for duplicate email without side effects", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });

    const result = await subscribeToWaitlist(
      {
        email: "existing@example.com",
      },
      null
    );

    expect(result).toEqual({
      status: "already_subscribed",
      message: "You're already on the list.",
      emailSent: false,
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockCaptureWaitlistSignup).not.toHaveBeenCalled();
  });

  it("returns subscribed when email delivery fails", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSendEmail.mockRejectedValue(new Error("Resend sandbox restriction"));
    mockCaptureWaitlistSignup.mockResolvedValue(undefined);

    const result = await subscribeToWaitlist(
      { email: "fail-email@example.com" },
      null
    );

    expect(result.status).toBe("subscribed");
    expect(result.emailSent).toBe(false);
    expect(result.message).toContain("confirmation email");
  });

  it("throws for unexpected database errors", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      subscribeToWaitlist({ email: "fail@example.com" }, null)
    ).rejects.toEqual(
      expect.objectContaining({ code: "42501", message: "permission denied" })
    );
  });
});
