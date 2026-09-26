import { syncFixturesToday } from "@/lib/ingestion/sync-fixtures-today";

async function main() {
  const result = await syncFixturesToday();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("sync-fixtures-today failed:", error);
  process.exit(1);
});
