import { Wordmark } from "@/components/brand/Wordmark";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <Wordmark size="hero" />
      <p className="text-muted-foreground max-w-md text-center text-sm">
        Foundation scaffolding is in place. Explore the design system at{" "}
        <a href="/ds" className="text-info underline-offset-4 hover:underline">
          /ds
        </a>
        .
      </p>
    </main>
  );
}
