import { cn } from "@/lib/utils";

type PlayerPhotoProps = {
  name: string;
  photoUrl: string | null;
  className?: string;
};

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function PlayerPhoto({ name, photoUrl, className }: PlayerPhotoProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote CDN photos without next/image config yet
      <img
        src={photoUrl}
        alt=""
        className={cn("size-14 shrink-0 rounded-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        className
      )}
    >
      {playerInitials(name)}
    </span>
  );
}
