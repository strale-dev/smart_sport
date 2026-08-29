export type WaitlistAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

export function getWaitlistAttribution(): WaitlistAttribution {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer.trim();

  return {
    utm_source: params.get("utm_source")?.trim() || undefined,
    utm_medium: params.get("utm_medium")?.trim() || undefined,
    utm_campaign: params.get("utm_campaign")?.trim() || undefined,
    referrer: referrer.length > 0 ? referrer : undefined,
  };
}
