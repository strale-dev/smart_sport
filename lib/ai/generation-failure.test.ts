import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { classifyGenerationFailure } from "@/lib/ai/generation-failure";
import { OpenAiGenerationError } from "@/lib/ai/openai";
import { LockNotAcquiredError } from "@/lib/redis/lock";
import { AiLimitReachedError } from "@/lib/ai/usage-gate";

describe("classifyGenerationFailure", () => {
  it("maps timeout provider errors", () => {
    const result = classifyGenerationFailure(
      new OpenAiGenerationError("Request timed out after 30s")
    );
    expect(result.reasonCode).toBe("OPENAI_TIMEOUT");
  });

  it("maps Zod validation to malformed output", () => {
    const result = classifyGenerationFailure(new ZodError([]));
    expect(result.reasonCode).toBe("MALFORMED_OUTPUT");
  });

  it("maps lock contention", () => {
    const result = classifyGenerationFailure(new LockNotAcquiredError("k"));
    expect(result.reasonCode).toBe("GENERATION_CONCURRENT");
  });

  it("maps daily limit", () => {
    const result = classifyGenerationFailure(
      new AiLimitReachedError("prediction", 5, 5)
    );
    expect(result.reasonCode).toBe("DAILY_LIMIT");
  });
});
