export type RatingTone = "high" | "mid" | "low" | "none";

export function formatRating(rating: number | null | undefined): string | null {
  if (rating == null || !Number.isFinite(rating)) {
    return null;
  }
  return rating.toFixed(1);
}

export function ratingTone(rating: number | null | undefined): RatingTone {
  if (rating == null || !Number.isFinite(rating)) {
    return "none";
  }
  if (rating >= 7) {
    return "high";
  }
  if (rating >= 6) {
    return "mid";
  }
  return "low";
}

export function ratingToneClass(rating: number | null | undefined): string {
  switch (ratingTone(rating)) {
    case "high":
      return "bg-emerald-600 text-white";
    case "mid":
      return "bg-amber-500 text-white";
    case "low":
      return "bg-red-600 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}
