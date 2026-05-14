import type { Network, RpcResponse } from "./types.js";

let requestId = 1;

function getEndpoint(network: Network): string {
  const key = network === "mainnet" ? "RSK_MAINNET_URL" : "RSK_TESTNET_URL";
  const url = process.env[key];
  if (!url) throw new Error(`${key} environment variable is not set`);
  return url;
}

export async function rpcCall<T = unknown>(
  network: Network,
  method: string,
  params: unknown[] = []
): Promise<T> {
  const url = getEndpoint(network);
  const id = requestId++;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as RpcResponse<T>;

  if (data.error) {
    throw new Error(`RPC error ${data.error.code}: ${data.error.message}`);
  }

  return data.result as T;
}
