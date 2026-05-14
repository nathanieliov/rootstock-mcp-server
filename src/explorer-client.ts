import type { Network } from "./types.js";

const EXPLORER_URLS: Record<Network, string> = {
  mainnet: "https://rootstock.blockscout.com",
  testnet: "https://rootstock-testnet.blockscout.com",
};

export async function explorerGet<T = unknown>(
  network: Network,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const base = EXPLORER_URLS[network];
  const url = new URL(`${base}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Explorer HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
