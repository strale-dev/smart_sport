import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  assertWaitlistRateLimit,
  WaitlistRateLimitError,
  WaitlistRateLimitUnavailableError,
} from "@/lib/ratelimit/waitlist";
import { getClientIp, getClientIpHash } from "@/lib/waitlist/ip";
import { waitlistSubscribeSchema } from "@/lib/waitlist/schema";
import { subscribeToWaitlist } from "@/lib/waitlist/service";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          details: [{ path: "", message: "Invalid JSON body" }],
        },
        { status: 400 }
      );
    }

    const input = waitlistSubscribeSchema.parse(body);

    await assertWaitlistRateLimit({
      ip: getClientIp(request),
      email: input.email,
    });

    const result = await subscribeToWaitlist(input, getClientIpHash(request));

    return NextResponse.json(
      {
        ok: true,
        status: result.status,
        message: result.message,
        emailSent: result.emailSent ?? false,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof WaitlistRateLimitError) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    if (error instanceof WaitlistRateLimitUnavailableError) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT_UNAVAILABLE" },
        { status: 503 }
      );
    }

    console.error("[waitlist/subscribe] unexpected error:", error);

    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
