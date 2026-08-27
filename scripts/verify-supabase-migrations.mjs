import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

const remote = [
  ["20260826191411", "0001_extensions_and_enums"],
  ["20260826191426", "0002_football_reference"],
  ["20260826191451", "0003_teams_players"],
  ["20260826191630", "0004_fixtures"],
  ["20260826191649", "0005_analytics"],
  ["20260826191725", "0006_predictions_and_ai"],
  ["20260826191743", "0007_users"],
  ["20260826191811", "0008_follows_favorites_notifications"],
  ["20260826191828", "0009_billing"],
  ["20260826191841", "0010_waitlist"],
  ["20260826191902", "0011_updated_at_triggers"],
  ["20260826191927", "0012_rls_reference"],
  ["20260826191947", "0013_rls_user_owned"],
  ["20260826191958", "0014_storage_avatars"],
  ["20260826192034", "0015_search_functions"],
  ["20260826192129", "0016_lockdown_handle_new_user"],
  ["20260826192214", "0017_missing_fk_indexes"],
];

const expected = remote
  .map(([version, name]) => `${version}_${name}.sql`)
  .sort();
const local = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const synced =
  local.length === expected.length &&
  local.every((file, index) => file === expected[index]);

if (!synced) {
  console.error("Migration filename drift detected.");
  console.error("Expected:", expected);
  console.error("Local:   ", local);
  process.exit(1);
}

console.log(`Migration filenames synced (${local.length}/17).`);
