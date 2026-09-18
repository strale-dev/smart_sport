import { RouteNotFound } from "@/components/common/RouteNotFound";

export default function PlayerNotFound() {
  return (
    <RouteNotFound
      title="Player not found"
      description="This player is not in our database yet, or the link is invalid."
    />
  );
}
