/** After a failed/timed-out Redis op, skip Redis for this serverless instance. */
let runtimeRedisDisabled = false;

/** Max wait per Redis REST call before fail-open to in-memory cache. */
export const REDIS_OPERATION_TIMEOUT_MS = 800;

export function isRuntimeRedisDisabled(): boolean {
  return runtimeRedisDisabled;
}

export function disableRuntimeRedis(): void {
  runtimeRedisDisabled = true;
}

export function resetRuntimeRedisForTests(): void {
  runtimeRedisDisabled = false;
}

export async function withRedisOperationTimeout<T>(
  operation: Promise<T>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Redis operation timed out"));
        }, REDIS_OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
