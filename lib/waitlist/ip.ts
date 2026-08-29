import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIp(ip: string): string {
  return hashValue(ip);
}

export function hashEmail(email: string): string {
  return hashValue(email.trim().toLowerCase());
}

export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return null;
}

export function getClientIpHash(request: NextRequest): string | null {
  const ip = getClientIp(request);
  return ip ? hashIp(ip) : null;
}
