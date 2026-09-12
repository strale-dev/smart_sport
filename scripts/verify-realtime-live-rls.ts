import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_REF = "zovobemlpqoclyjhvkpw";
const MIGRATION_FILE =
  "supabase/migrations/20260912160000_0021_realtime_live_broadcast_rls.sql";
const REQUIRED = [
  "live_topics_receive_broadcast",
  "live_topics_track_presence",
] as const;

function queryPolicies(): string[] {
  const sql =
    "SELECT policyname FROM pg_policies WHERE schemaname = 'realtime' AND tablename = 'messages';";
  const out = execSync(
    `npx.cmd supabase db query --linked ${JSON.stringify(sql)}`,
    {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  const jsonMatch = out.match(/\{[\s\S]*"rows"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  if (!jsonMatch) {
    return [];
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      rows?: { policyname?: string }[];
    };
    return (parsed.rows ?? [])
      .map((r) => r.policyname)
      .filter((n): n is string => Boolean(n));
  } catch {
    return [];
  }
}

async function main() {
  let names: string[] = [];
  try {
    names = queryPolicies();
  } catch (err) {
    console.warn("Could not query policies via linked CLI:", err);
  }

  const missing = REQUIRED.filter((p) => !names.includes(p));
  if (missing.length === 0) {
    console.log("Realtime live RLS OK:", REQUIRED.join(", "));
    return;
  }

  console.error(
    "Missing Realtime policies on realtime.messages:",
    missing.join(", ")
  );
  console.error("");
  console.error(
    "Apply once in Supabase Dashboard → SQL Editor (postgres owner; CLI/MCP cannot alter this table):"
  );
  console.error(
    `  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`
  );
  console.error("");
  console.error("Paste the contents of:");
  console.error(`  ${MIGRATION_FILE}`);
  console.error("");
  console.error("--- SQL preview ---");
  console.error(readFileSync(join(process.cwd(), MIGRATION_FILE), "utf8"));
  process.exit(1);
}

void main();
