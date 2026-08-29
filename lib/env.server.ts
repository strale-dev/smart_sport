import { parsePublicEnv, parseServerEnv, type ServerEnv } from "@/lib/env";

export const env = parsePublicEnv();

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = parseServerEnv();
  }

  return cachedServerEnv;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== "string") {
      return undefined;
    }

    return getServerEnv()[prop as keyof ServerEnv];
  },
});
