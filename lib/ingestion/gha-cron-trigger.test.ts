import { describe, expect, it } from "vitest";

import {
  isGhaCronTriggerFailure,
  parseCronTriggerJsonBody,
} from "@/lib/ingestion/gha-cron-trigger";

describe("GHA cron trigger response", () => {
  it("fails on non-2xx HTTP", () => {
    expect(isGhaCronTriggerFailure(false, null)).toBe(true);
  });

  it("succeeds on HTTP 2xx with ok:true", () => {
    expect(isGhaCronTriggerFailure(true, { ok: true })).toBe(false);
  });

  it("succeeds when job was intentionally skipped", () => {
    expect(isGhaCronTriggerFailure(true, { ok: false, skipped: true })).toBe(
      false
    );
  });

  it("fails when HTTP 200 but ok:false without skip (degraded cron)", () => {
    expect(isGhaCronTriggerFailure(true, { ok: false, degraded: true })).toBe(
      true
    );
  });

  it("parses JSON cron bodies", () => {
    expect(
      parseCronTriggerJsonBody(
        '{"ok":false,"degraded":true,"job":"warm-ai-prematch"}'
      )
    ).toMatchObject({ ok: false, degraded: true, job: "warm-ai-prematch" });
  });

  it("returns null for empty or invalid JSON", () => {
    expect(parseCronTriggerJsonBody("")).toBeNull();
    expect(parseCronTriggerJsonBody("not-json")).toBeNull();
  });
});
