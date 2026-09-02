import { cn } from "@/lib/utils";
import { getLeagueLogoUrl } from "@/lib/live/constants";

type LeagueFilterLogoProps = {
  providerId: number;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

export function LeagueFilterLogo({
  providerId,
  label,
  className,
  size = "sm",
}: LeagueFilterLogoProps) {
  const sizeClass = size === "md" ? "size-5" : "size-4";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getLeagueLogoUrl(providerId)}
      alt=""
      aria-hidden="true"
      className={cn(sizeClass, "shrink-0 object-contain", className)}
      loading="lazy"
      title={label}
    />
  );
}
