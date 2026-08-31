import { getIngestionConfig } from "@/lib/ingestion/config";

export async function throttleProviderRequest(
  source: Record<string, string | undefined> = process.env
): Promise<void> {
  const { providerThrottleMs } = getIngestionConfig(source);
  if (providerThrottleMs <= 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, providerThrottleMs);
  });
}
