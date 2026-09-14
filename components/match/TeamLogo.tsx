import Image from "next/image";

import {
  MATCH_HEADER_LOGO_SIZES,
  MATCH_ROW_LOGO_SIZES,
  resolveLogoPixelSize,
} from "@/lib/images/logo-dimensions";
import { cn } from "@/lib/utils";

type TeamLogoProps = {
  name: string;
  logoUrl: string | null;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  sizes?: string;
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

export function TeamLogo({
  name,
  logoUrl,
  className,
  priority = false,
  loading,
  sizes,
}: TeamLogoProps) {
  if (logoUrl) {
    const pixelSize = resolveLogoPixelSize(className);
    const imageLoading = priority ? undefined : (loading ?? "lazy");

    return (
      <Image
        src={logoUrl}
        alt=""
        width={pixelSize}
        height={pixelSize}
        className={cn("size-8 shrink-0 object-contain", className)}
        priority={priority}
        loading={imageLoading}
        sizes={sizes ?? MATCH_ROW_LOGO_SIZES}
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

export { MATCH_HEADER_LOGO_SIZES, MATCH_ROW_LOGO_SIZES };
