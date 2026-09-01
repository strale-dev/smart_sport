import { describe, expect, it } from "vitest";

import {
  getPasswordStrength,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updatePasswordSchema,
} from "./schema";

describe("loginSchema", () => {
  it("parses a valid payload and normalizes email", () => {
    const result = loginSchema.parse({
      email: "  User@Example.com ",
      password: "secret",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("secret");
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const validSignup = {
    displayName: "Alex Fan",
    email: "user@example.com",
    password: "password1",
    confirmPassword: "password1",
    acceptTerms: true,
    marketingOptIn: false,
  };

  it("accepts a complete signup payload", () => {
    const result = signupSchema.parse(validSignup);
    expect(result.displayName).toBe("Alex Fan");
    expect(result.email).toBe("user@example.com");
  });

  it("rejects passwords without a number", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "passwordonly",
      confirmPassword: "passwordonly",
    });

    expect(result.success).toBe(false);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "short1",
      confirmPassword: "short1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      confirmPassword: "password2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("requires accepting terms", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      acceptTerms: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty display name", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      displayName: " ",
    });

    expect(result.success).toBe(false);
  });
});

describe("getPasswordStrength", () => {
  it("scores stronger passwords higher", () => {
    expect(getPasswordStrength("").score).toBe(0);
    expect(getPasswordStrength("password1").score).toBeGreaterThan(0);
    expect(getPasswordStrength("LongPassword1!").score).toBeGreaterThanOrEqual(
      3
    );
  });
});

describe("resetPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(
      resetPasswordSchema.safeParse({ email: "not-an-email" }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.parse({ email: "  User@Example.com " }).email
    ).toBe("user@example.com");
  });
});

describe("updatePasswordSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password2",
    });

    expect(result.success).toBe(false);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = updatePasswordSchema.safeParse({
      password: "short1",
      confirmPassword: "short1",
    });

    expect(result.success).toBe(false);
  });
});
