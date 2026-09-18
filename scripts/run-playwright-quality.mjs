#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(cmd, ["playwright", "test"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_QUALITY_BROWSERS: "1" },
});

process.exit(result.status ?? 1);
