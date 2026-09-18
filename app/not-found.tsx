import { RouteNotFound } from "@/components/common/RouteNotFound";

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center">
      <RouteNotFound
        title="Page not found"
        description="This page doesn't exist or may have moved. Head back to fixtures or the home page."
      />
    </div>
  );
}
