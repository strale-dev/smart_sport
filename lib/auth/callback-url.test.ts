import { describe, expect, it } from "vitest";

import {
  PASSWORD_RECOVERY_CALLBACK_PATH,
  passwordRecoveryCallbackUrlForOrigin,
} from "./callback-url";

describe("passwordRecoveryCallbackUrlForOrigin", () => {
  it("uses a dedicated recovery callback without query params", () => {
    expect(passwordRecoveryCallbackUrlForOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000/api/auth/callback/recovery"
    );
    expect(PASSWORD_RECOVERY_CALLBACK_PATH).toBe("/api/auth/callback/recovery");
  });
});
