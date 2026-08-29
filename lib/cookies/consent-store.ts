import {
  CONSENT_STORAGE_KEY,
  readConsentFromStorage,
  writeConsentToStorage,
} from "@/lib/cookies/consent";
import type { CookieConsentState } from "@/lib/cookies/types";

const listeners = new Set<() => void>();

let cachedSerialized: string | null = null;
let cachedSnapshot: CookieConsentState | null = null;

function invalidateConsentCache(): void {
  cachedSerialized = null;
  cachedSnapshot = null;
}

export function subscribeToConsent(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getConsentSnapshot(): CookieConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const serialized = localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";

  if (serialized === cachedSerialized) {
    return cachedSnapshot;
  }

  cachedSerialized = serialized;
  cachedSnapshot = serialized ? readConsentFromStorage(localStorage) : null;

  return cachedSnapshot;
}

export function getConsentServerSnapshot(): CookieConsentState | null {
  return null;
}

export function persistConsentSnapshot(consent: CookieConsentState): void {
  writeConsentToStorage(localStorage, consent);
  cachedSerialized = localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";
  cachedSnapshot = consent;
  listeners.forEach((listener) => listener());
}

export function resetConsentCacheForTests(): void {
  invalidateConsentCache();
}
