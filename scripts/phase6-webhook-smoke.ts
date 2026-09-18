import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npm.cmd",
  ["run", "test:ci", "--", "lib/billing/sync-subscription.test.ts"],
  {
    stdio: "inherit",
    shell: true,
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("phase6:webhook-smoke passed.");
