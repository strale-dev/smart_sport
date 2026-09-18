export function lineupPlayerShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "–";
  }
  return parts[parts.length - 1] ?? fullName;
}
