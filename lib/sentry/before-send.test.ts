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
});
