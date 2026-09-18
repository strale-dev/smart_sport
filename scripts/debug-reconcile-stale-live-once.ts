import "./preload-env";
import { reconcileStaleLiveFixtures } from "@/lib/live/reconcile-stale-live";

async function main() {
  const result = await reconcileStaleLiveFixtures({
    maxRevalidations: 20,
    source: "debug-reconcile-stale-live-once",
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
