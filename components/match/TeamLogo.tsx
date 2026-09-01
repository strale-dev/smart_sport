import { cn } from "@/lib/utils";

type TeamLogoProps = {
  name: string;
  logoUrl: string | null;
  className?: string;
};

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function TeamLogo({ name, logoUrl, className }: TeamLogoProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote CDN logos without next/image config yet
      <img
        src={logoUrl}
        alt=""
        className={cn("size-8 shrink-0 object-contain", className)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        className
      )}
    >
      {teamInitials(name)}
    </span>
  );
}
