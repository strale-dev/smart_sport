import {
  warmAiPrematchInsights,
  type WarmAiPrematchScope,
} from "@/lib/ingestion/warm-ai-prematch";

function parseScope(argv: string[]): WarmAiPrematchScope {
  const arg = argv.find((item) => item.startsWith("--scope="));
  const raw = arg?.slice("--scope=".length) ?? "daily";
  return raw === "imminent" ? "imminent" : "daily";
}

async function main() {
  const scope = parseScope(process.argv.slice(2));
  const result = await warmAiPrematchInsights(scope);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("warm-ai-prematch failed:", error);
  process.exit(1);
});
