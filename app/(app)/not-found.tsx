import { RouteNotFound } from "@/components/common/RouteNotFound";

export default function AppNotFound() {
  return (
    <RouteNotFound
      title="Page not found"
      description="We couldn't find this screen in the app. Try fixtures or return to your dashboard."
    />
  );
}
