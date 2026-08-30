import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnvForScripts } from "@/lib/env/load-local";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

loadLocalEnvForScripts(rootDir);
