import fs from "node:fs";
import path from "node:path";

import { normalizeEnvValue } from "@/lib/env/normalize-env-value";

export { normalizeEnvValue };

type LoadEnvFileOptions = {
  override?: boolean;
};

export function loadEnvFile(
  filePath: string,
  options: LoadEnvFileOptions = {}
): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(trimmed.slice(separatorIndex + 1));

    if (options.override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

export function loadLocalEnv(rootDir = process.cwd()): void {
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env"));
}

export function loadLocalEnvForScripts(rootDir = process.cwd()): void {
  loadLocalEnv(rootDir);
}
