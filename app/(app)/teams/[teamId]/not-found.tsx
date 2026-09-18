import { RouteNotFound } from "@/components/common/RouteNotFound";

export default function TeamNotFound() {
  return (
    <RouteNotFound
      title="Team not found"
      description="This club is not in our database yet, or the link is invalid."
    />
  );
}
