/** PostHog server capture requires a Project API key (phc_), not a personal key (phx_). */
export function isPostHogProjectKey(key: string): boolean {
  return key.startsWith("phc_");
}
