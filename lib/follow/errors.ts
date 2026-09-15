import { getFreeTierFollowsTotalLimit } from "@/lib/entitlements/limits";

export class FollowLimitReachedError extends Error {
  readonly code = "FOLLOW_LIMIT_REACHED" as const;
  readonly limit: number;

  constructor(limit = getFreeTierFollowsTotalLimit()) {
    super("Follow limit reached");
    this.name = "FollowLimitReachedError";
    this.limit = limit;
  }
}

export class EntityNotFoundError extends Error {
  readonly code = "ENTITY_NOT_FOUND" as const;

  constructor(message = "Entity not found") {
    super(message);
    this.name = "EntityNotFoundError";
  }
}

export class SignInRequiredError extends Error {
  readonly code = "SIGN_IN_REQUIRED" as const;

  constructor() {
    super("Sign in required");
    this.name = "SignInRequiredError";
  }
}

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function mapFollowInsertError(error: PostgrestLikeError): Error {
  const message = error.message ?? "";
  const details = error.details ?? "";

  if (
    message.includes("FOLLOW_LIMIT_REACHED") ||
    details.includes("FOLLOW_LIMIT_REACHED") ||
    error.code === "23514"
  ) {
    return new FollowLimitReachedError();
  }

  return new Error(message || "Failed to follow");
}
