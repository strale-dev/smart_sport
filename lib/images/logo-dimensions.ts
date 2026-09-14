/** Tailwind `size-*` (1 unit = 0.25rem = 4px at default root). */
export function resolveLogoPixelSize(className?: string): number {
  const tokens = className?.split(/\s+/).filter(Boolean) ?? [];
  let max = 32;

  for (const token of tokens) {
    const match = token.match(/^(?:sm:|md:|lg:)?size-(\d+(?:\.\d+)?)$/);
    if (!match) {
      continue;
    }
    const px = Number(match[1]) * 4;
    if (px > max) {
      max = px;
    }
  }

  return max;
}

export const MATCH_HEADER_LOGO_SIZES = "(max-width: 640px) 40px, 64px";

export const MATCH_ROW_LOGO_SIZES = "32px";

export const LEAGUE_LINK_LOGO_SIZES = "16px";
