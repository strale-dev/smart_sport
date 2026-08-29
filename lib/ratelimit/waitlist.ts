import { Ratelimit } from "@upstash/ratelimit";

import { env } from "@/lib/env.server";
import { getRedis } from "@/lib/redis/client";

export class WaitlistRateLimitError extends Error {
  readonly code = "RATE_LIMITED" as const;

  constructor() {
    super("Rate limit exceeded");
    this.name = "WaitlistRateLimitError";
  }
}

export class WaitlistRateLimitUnavailableError extends Error {
  readonly code = "RATE_LIMIT_UNAVAILABLE" as const;

  constructor() {
    super("Rate limiting is unavailable");
    this.name = "WaitlistRateLimitUnavailableError";
  }
}

let ipRateLimit: Ratelimit | null | undefined;
let emailRateLimit: Ratelimit | null | undefined;

function getIpRateLimit(): Ratelimit | null {
  if (ipRateLimit !== undefined) {
    return ipRateLimit;
  }

  const redis = getRedis();
  if (!redis) {
    ipRateLimit = null;
    return ipRateLimit;
  }

  ipRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "waitlist:ip",
  });

  return ipRateLimit;
}

function getEmailRateLimit(): Ratelimit | null {
  if (emailRateLimit !== undefined) {
    return emailRateLimit;
  }

  const redis = getRedis();
  if (!redis) {
    emailRateLimit = null;
    return emailRateLimit;
  }

  emailRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "waitlist:email",
  });

  return emailRateLimit;
}

function isProduction(): boolean {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

export async function assertWaitlistRateLimit(input: {
  ip: string | null;
  email: string;
}): Promise<void> {
  const ipLimiter = getIpRateLimit();
  const emailLimiter = getEmailRateLimit();

  if (!ipLimiter || !emailLimiter) {
    if (isProduction()) {
      throw new WaitlistRateLimitUnavailableError();
    }

    console.warn(
      "[waitlist] Redis is not configured — skipping rate limit in development."
    );
    return;
  }

  if (input.ip) {
    const ipResult = await ipLimiter.limit(input.ip);
    if (!ipResult.success) {
      throw new WaitlistRateLimitError();
    }
  }

  const emailResult = await emailLimiter.limit(input.email);
  if (!emailResult.success) {
    throw new WaitlistRateLimitError();
  }
}
