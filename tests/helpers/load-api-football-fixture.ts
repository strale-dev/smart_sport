import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ApiFootballEnvelope } from "@/lib/api-football/types";

export function loadApiFootballFixture<T>(
  filename: string
): ApiFootballEnvelope<T> {
  const filePath = join(process.cwd(), "tests/fixtures/api-football", filename);
  return JSON.parse(readFileSync(filePath, "utf8")) as ApiFootballEnvelope<T>;
}
