import { cn } from "@/lib/utils";

const sizeClasses = {
  nav: "h-6 w-auto",
  hero: "h-10 w-auto",
} as const;

type WordmarkSize = keyof typeof sizeClasses;

type WordmarkProps = {
  size?: WordmarkSize;
  className?: string;
};

export function Wordmark({ size = "nav", className }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Kivora"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <svg
        viewBox="0 0 160 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size])}
        aria-hidden="true"
      >
        <text
          x="0"
          y="30"
          fill="currentColor"
          className="fill-foreground font-heading"
          style={{
            fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Kivora
        </text>
        <circle cx="148" cy="10" r="5" className="fill-primary" />
      </svg>
    </span>
  );
}
