import { normalizeEnvValue } from "@/lib/env/normalize-env-value";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === "" || value === undefined) {
    return undefined;
  }
  return normalizeEnvValue(value);
}

export type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function hasWebPushConfig(
  source: Record<string, string | undefined> = process.env
): boolean {
  return Boolean(
    emptyToUndefined(source.VAPID_PUBLIC_KEY) &&
    emptyToUndefined(source.VAPID_PRIVATE_KEY) &&
    emptyToUndefined(source.VAPID_SUBJECT)
  );
}

export function getWebPushConfig(
  source: Record<string, string | undefined> = process.env
): WebPushConfig | null {
  const publicKey = emptyToUndefined(source.VAPID_PUBLIC_KEY);
  const privateKey = emptyToUndefined(source.VAPID_PRIVATE_KEY);
  const subject =
    emptyToUndefined(source.VAPID_SUBJECT) ?? "mailto:hello@scorence.app";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}
