import { describe, expect, it } from "vitest";

import { sentryBeforeSend } from "@/lib/sentry/before-send";

describe("sentryBeforeSend", () => {
  it("drops ApiFootball errors on internal live poll routes", () => {
    const error = new Error("API-Football provider returned errors");
    error.name = "ApiFootballError";

    const result = sentryBeforeSend(
      {
        transaction: "POST /api/internal/live/poll-center-tick",
      } as Parameters<typeof sentryBeforeSend>[0],
      { originalException: error }
    );

    expect(result).toBeNull();
  });

  it("keeps ApiFootball errors on user-facing routes", () => {
    const error = new Error("API-Football provider returned errors");
    error.name = "ApiFootballError";

    const event = {
      transaction: "GET /teams/[teamId]",
    } as Parameters<typeof sentryBeforeSend>[0];

    const result = sentryBeforeSend(event, { originalException: error });

    expect(result).toBe(event);
  });

  it("drops live_prediction_unavailable messages", () => {
    const event = {
      message: "live_prediction_unavailable",
      transaction: "POST /api/internal/live/poll-tick",
    } as Parameters<typeof sentryBeforeSend>[0];

    expect(sentryBeforeSend(event, {})).toBeNull();
  });

  it("drops Upstash quota exceeded errors", () => {
    const error = new Error(
      "Command failed: ERR max requests limit exceeded. Limit: 500000, Usage: 500000."
    );
    error.name = "UpstashError";

    const event = {
      transaction: "GET /api/cron/sync-fixtures-today",
    } as Parameters<typeof sentryBeforeSend>[0];

    expect(sentryBeforeSend(event, { originalException: error })).toBeNull();
  });

  it("drops prematch not-ready availability errors", () => {
    const error = new Error("Fixture 123 not ready for prematch prediction");

    const event = {
      transaction: "GET /api/ai/prematch/123",
    } as Parameters<typeof sentryBeforeSend>[0];

    expect(sentryBeforeSend(event, { originalException: error })).toBeNull();
  });

  it("drops transient Supabase pool/timeout errors", () => {
    const error = new Error(
      "Failed to read fixtures for 2026-10-18: Timed out acquiring connection from connection pool."
    );

    const event = {
      transaction: "GET /",
    } as Parameters<typeof sentryBeforeSend>[0];

    expect(sentryBeforeSend(event, { originalException: error })).toBeNull();
  });

  it("drops API-Football daily quota low messages", () => {
    const event = {
      message: "API-Football daily quota is low",
      transaction: "GET /api/cron/sync-fixtures-future",
    } as Parameters<typeof sentryBeforeSend>[0];

    expect(sentryBeforeSend(event, {})).toBeNull();
  });
});
