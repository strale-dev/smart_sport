import { describe, expect, it } from "vitest";

import {
  buildAutoEnsureKey,
  isAutoEnsureLockingOutcome,
  recordAutoEnsureOutcome,
  shouldStartAutoEnsure,
} from "@/lib/ai/prematch-auto-ensure";

describe("prematch auto-ensure", () => {
  const baseKeyInput = {
    fixtureId: 123,
    predictionFingerprint: "fp-v1",
    contextHash: "hash-a",
    aiGenerationAllowed: true,
    aiContextReady: true,
  };

  it("buildAutoEnsureKey changes when readiness or hash changes", () => {
    const k1 = buildAutoEnsureKey(baseKeyInput);
    const k2 = buildAutoEnsureKey({
      ...baseKeyInput,
      contextHash: "hash-b",
    });
    const k3 = buildAutoEnsureKey({
      ...baseKeyInput,
      aiGenerationAllowed: false,
    });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it("does not lock on UNAVAILABLE outcome for same key", () => {
    const currentKey = buildAutoEnsureKey(baseKeyInput);
    expect(isAutoEnsureLockingOutcome("UNAVAILABLE")).toBe(false);
    expect(
      shouldStartAutoEnsure({
        inFlight: false,
        lastLockedKey: currentKey,
        currentKey,
        lastPostOutcome: "UNAVAILABLE",
      })
    ).toBe(true);
  });

  it("locks after OK for same key", () => {
    const currentKey = buildAutoEnsureKey(baseKeyInput);
    expect(
      shouldStartAutoEnsure({
        inFlight: false,
        lastLockedKey: currentKey,
        currentKey,
        lastPostOutcome: "OK",
      })
    ).toBe(false);
  });

  it("T0–T5: retry after UNAVAILABLE when context hash becomes ready", () => {
    const keyNotReady = buildAutoEnsureKey({
      ...baseKeyInput,
      aiContextReady: false,
      aiGenerationAllowed: false,
    });
    const keyReady = buildAutoEnsureKey(baseKeyInput);

    expect(
      shouldStartAutoEnsure({
        inFlight: false,
        lastLockedKey: recordAutoEnsureOutcome({
          currentKey: keyNotReady,
          postOutcome: "UNAVAILABLE",
        }),
        currentKey: keyReady,
        lastPostOutcome: "UNAVAILABLE",
      })
    ).toBe(true);

    expect(
      recordAutoEnsureOutcome({
        currentKey: keyNotReady,
        postOutcome: "UNAVAILABLE",
      })
    ).toBeNull();
  });

  it("does not start when in flight", () => {
    expect(
      shouldStartAutoEnsure({
        inFlight: true,
        lastLockedKey: null,
        currentKey: buildAutoEnsureKey(baseKeyInput),
        lastPostOutcome: null,
      })
    ).toBe(false);
  });
});
