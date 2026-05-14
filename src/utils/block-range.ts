import type { Network } from "../types.js";
import { rpcCall } from "../rpc-client.js";

const RSK_BLOCK_TIME_SECONDS = 30;

export async function getFromBlockForDays(network: Network, days: number): Promise<string> {
  const currentHex = await rpcCall<string>(network, "eth_blockNumber", []);
  const currentBlock = parseInt(currentHex, 16);
  const blocksBack = Math.floor((days * 86400) / RSK_BLOCK_TIME_SECONDS);
  const fromBlock = Math.max(0, currentBlock - blocksBack);
  return `0x${fromBlock.toString(16)}`;
}
