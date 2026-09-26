import { describe, expect, it, vi } from "vitest";

import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";

describe("logIngestionEvent", () => {
  it("emits JSON with job_name, stage, and fixture_id", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logIngestionEvent({
      job_name: "warm-ai-prematch",
      stage: "fixture_unit",
      fixture_id: 1545658,
      ok: true,
    });

    expect(info).toHaveBeenCalledOnce();
    const raw = String(info.mock.calls[0]?.[0]);
    expect(raw).toContain("[ingestion]");
    const jsonPart = raw.replace("[ingestion] ", "");
    const parsed = JSON.parse(jsonPart) as Record<string, unknown>;
    expect(parsed.job_name).toBe("warm-ai-prematch");
    expect(parsed.stage).toBe("fixture_unit");
    expect(parsed.fixture_id).toBe(1545658);
    expect(typeof parsed.ts).toBe("string");

    info.mockRestore();
  });

  it("uses warn for error_type", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    logIngestionEvent({
      job_name: "sync-fixtures-future",
      stage: "complete",
      ok: false,
      error_type: "upsert_error",
    });

    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
