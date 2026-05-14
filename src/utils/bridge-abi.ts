import { createRequire } from "node:module";
import { Interface, type InterfaceAbi, type Result } from "ethers";
import type { Network } from "../types.js";
import { rpcCall } from "../rpc-client.js";

const require = createRequire(import.meta.url);

const bridgeModule = require("@rsksmart/rsk-precompiled-abis/bridge") as {
  abi: InterfaceAbi;
  address: string;
};

export const BRIDGE_ADDRESS = bridgeModule.address;
export const bridgeInterface = new Interface(bridgeModule.abi);

export const PEGIN_TOPICS = {
  pegin_btc: bridgeInterface.getEvent("pegin_btc")!.topicHash,
  lock_btc: bridgeInterface.getEvent("lock_btc")!.topicHash,
  rejected_pegin: bridgeInterface.getEvent("rejected_pegin")!.topicHash,
  unrefundable_pegin: bridgeInterface.getEvent("unrefundable_pegin")!.topicHash,
};

export const PEGOUT_TOPICS = {
  release_request_received: bridgeInterface.getEvent("release_request_received")!.topicHash,
  release_request_rejected: bridgeInterface.getEvent("release_request_rejected")!.topicHash,
  release_requested: bridgeInterface.getEvent("release_requested")!.topicHash,
  batch_pegout_created: bridgeInterface.getEvent("batch_pegout_created")!.topicHash,
  pegout_transaction_created: bridgeInterface.getEvent("pegout_transaction_created")!.topicHash,
  pegout_confirmed: bridgeInterface.getEvent("pegout_confirmed")!.topicHash,
  release_btc: bridgeInterface.getEvent("release_btc")!.topicHash,
};

// key=topicHash, value=eventName
const TOPIC_TO_NAME = new Map<string, string>([
  ...(Object.entries(PEGIN_TOPICS) as [string, string][]).map(
    ([name, hash]) => [hash, name] as [string, string]
  ),
  ...(Object.entries(PEGOUT_TOPICS) as [string, string][]).map(
    ([name, hash]) => [hash, name] as [string, string]
  ),
]);

export interface RawLog {
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  blockHash?: string;
}

export interface DecodedLog {
  eventName: string;
  blockNumber: number;
  txHash: string;
  args: Record<string, unknown>;
}

export function decodeBridgeLog(log: RawLog): DecodedLog | null {
  const topic0 = log.topics[0];
  if (!topic0 || !TOPIC_TO_NAME.has(topic0)) return null;

  try {
    const parsed = bridgeInterface.parseLog({ topics: log.topics, data: log.data });
    if (!parsed) return null;
    return {
      eventName: parsed.name,
      blockNumber: parseInt(log.blockNumber, 16),
      txHash: log.transactionHash,
      args: serializeResult(parsed.args),
    };
  } catch {
    return null;
  }
}

function serializeResult(result: Result): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.toObject())) {
    out[key] = serializeValue(value);
  }
  return out;
}

function serializeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeValue(v)])
    );
  }
  return value;
}

const MAX_LOG_CHUNK_BLOCKS = 1000;
const MAX_PARALLEL_CHUNKS = 10;

export interface LogFilter {
  address?: string;
  topics?: (string | string[] | null)[];
}

export async function fetchLogsChunked(
  network: Network,
  fromBlock: string,
  toBlock: string,
  filter: LogFilter
): Promise<RawLog[]> {
  const from = parseInt(fromBlock, 16);
  const resolvedTo =
    toBlock === "latest"
      ? parseInt(await rpcCall<string>(network, "eth_blockNumber", []), 16)
      : parseInt(toBlock, 16);

  const chunks: Array<{ from: string; to: string }> = [];
  for (let start = from; start <= resolvedTo; start += MAX_LOG_CHUNK_BLOCKS) {
    const end = Math.min(start + MAX_LOG_CHUNK_BLOCKS - 1, resolvedTo);
    chunks.push({
      from: `0x${start.toString(16)}`,
      to: `0x${end.toString(16)}`,
    });
  }

  const allLogs: RawLog[] = [];

  for (let i = 0; i < chunks.length; i += MAX_PARALLEL_CHUNKS) {
    const batch = chunks.slice(i, i + MAX_PARALLEL_CHUNKS);
    const results = await Promise.all(
      batch.map((chunk) =>
        rpcCall<RawLog[]>(network, "eth_getLogs", [
          { ...filter, fromBlock: chunk.from, toBlock: chunk.to },
        ])
      )
    );
    for (const logs of results) allLogs.push(...logs);
  }

  return allLogs;
}

export async function callBridgeFn(
  network: Network,
  functionName: string,
  args: unknown[] = []
): Promise<Result> {
  const data = bridgeInterface.encodeFunctionData(functionName, args);
  const result = await rpcCall<string>(network, "eth_call", [
    { to: BRIDGE_ADDRESS, data },
    "latest",
  ]);
  return bridgeInterface.decodeFunctionResult(functionName, result);
}
