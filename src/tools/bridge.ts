import { createRequire } from "node:module";
import { JsonRpcProvider } from "ethers";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolResult, toolError, satoshisToRbtc, normalizeBlockTag } from "../utils.js";
import {
  BRIDGE_ADDRESS,
  PEGIN_TOPICS,
  PEGOUT_TOPICS,
  decodeBridgeLog,
  callBridgeFn,
  fetchLogsChunked,
} from "../utils/bridge-abi.js";
import { getFromBlockForDays } from "../utils/block-range.js";
import type { Network } from "../types.js";

const require = createRequire(import.meta.url);

// Lazy provider cache per network for bridge-transaction-parser
const providers: Partial<Record<Network, JsonRpcProvider>> = {};

function getProvider(network: Network): JsonRpcProvider {
  if (!providers[network]) {
    const key = network === "mainnet" ? "RSK_MAINNET_URL" : "RSK_TESTNET_URL";
    const url = process.env[key];
    if (!url) throw new Error(`${key} environment variable is not set`);
    providers[network] = new JsonRpcProvider(url);
  }
  return providers[network]!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BridgeTransactionParser = require("@rsksmart/bridge-transaction-parser") as any;

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

const PEGOUT_EVENT_NAMES = [
  "release_request_received",
  "release_request_rejected",
  "release_requested",
  "batch_pegout_created",
  "pegout_transaction_created",
  "pegout_confirmed",
  "release_btc",
] as const;

type PegoutEventName = (typeof PEGOUT_EVENT_NAMES)[number];

export function registerBridgeTools(server: McpServer): void {
  // ── bridge_get_pegins ─────────────────────────────────────────────────────
  server.tool(
    "bridge_get_pegins",
    "Query pegin (BTC→RBTC) events registered on the Rootstock bridge. Returns successful pegins, rejected pegins, and unrefundable pegins over a block/time range.",
    {
      network,
      days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .default(30)
        .describe("Number of past days to search (ignored when fromBlock is set)"),
      fromBlock: z
        .string()
        .optional()
        .describe("Starting block number (decimal, hex, or 'earliest'). Overrides days."),
      toBlock: z
        .string()
        .default("latest")
        .describe("Ending block number (decimal, hex, or 'latest')"),
      includeRejected: z
        .boolean()
        .default(true)
        .describe("Include rejected and unrefundable pegins in results"),
    },
    async ({ network: net, days, fromBlock, toBlock, includeRejected }) => {
      try {
        const from = fromBlock
          ? normalizeBlockTag(fromBlock)
          : await getFromBlockForDays(net, days);
        const to = normalizeBlockTag(toBlock);

        const peginTopics = [PEGIN_TOPICS.pegin_btc, PEGIN_TOPICS.lock_btc];
        const rejectedTopics = includeRejected
          ? [PEGIN_TOPICS.rejected_pegin, PEGIN_TOPICS.unrefundable_pegin]
          : [];
        const allTopics = [...peginTopics, ...rejectedTopics];

        const logs = await fetchLogsChunked(net, from, to, {
          address: BRIDGE_ADDRESS,
          topics: [allTopics],
        });

        const pegins: unknown[] = [];
        const rejected: unknown[] = [];

        for (const log of logs) {
          const decoded = decodeBridgeLog(log);
          if (!decoded) continue;

          if (
            decoded.eventName === "pegin_btc" ||
            decoded.eventName === "lock_btc"
          ) {
            const args = decoded.args;
            const amountSats = String(args.amount ?? "0");
            pegins.push({
              type: decoded.eventName,
              blockNumber: decoded.blockNumber,
              txHash: decoded.txHash,
              receiver: args.receiver,
              btcTxHash: args.btcTxHash,
              senderBtcAddress: args.senderBtcAddress ?? null,
              protocolVersion: args.protocolVersion ?? null,
              amountSatoshis: amountSats,
              amountRbtc: satoshisToRbtc(amountSats),
            });
          } else if (
            decoded.eventName === "rejected_pegin" ||
            decoded.eventName === "unrefundable_pegin"
          ) {
            rejected.push({
              type: decoded.eventName,
              blockNumber: decoded.blockNumber,
              txHash: decoded.txHash,
              btcTxHash: decoded.args.btcTxHash,
              reason: decoded.args.reason,
            });
          }
        }

        return toolResult({
          network: net,
          fromBlock: from,
          toBlock: to,
          successfulPeginCount: pegins.length,
          rejectedPeginCount: rejected.length,
          pegins,
          ...(includeRejected ? { rejectedPegins: rejected } : {}),
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── bridge_get_pegouts ────────────────────────────────────────────────────
  server.tool(
    "bridge_get_pegouts",
    "Query pegout (RBTC→BTC) lifecycle events on the Rootstock bridge. Covers the full pegout lifecycle: request received → requested → batch created → confirmed.",
    {
      network,
      days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .default(30)
        .describe("Number of past days to search (ignored when fromBlock is set)"),
      fromBlock: z
        .string()
        .optional()
        .describe("Starting block number. Overrides days."),
      toBlock: z
        .string()
        .default("latest")
        .describe("Ending block number"),
      eventTypes: z
        .array(z.enum(PEGOUT_EVENT_NAMES))
        .default([...PEGOUT_EVENT_NAMES])
        .describe(
          "Pegout event types to include. Options: release_request_received, release_request_rejected, release_requested, batch_pegout_created, pegout_transaction_created, pegout_confirmed, release_btc"
        ),
    },
    async ({ network: net, days, fromBlock, toBlock, eventTypes }) => {
      try {
        const from = fromBlock
          ? normalizeBlockTag(fromBlock)
          : await getFromBlockForDays(net, days);
        const to = normalizeBlockTag(toBlock);

        const selectedTopics = (eventTypes as PegoutEventName[]).map(
          (name) => PEGOUT_TOPICS[name]
        );

        const logs = await fetchLogsChunked(net, from, to, {
          address: BRIDGE_ADDRESS,
          topics: [selectedTopics],
        });

        const pegouts: unknown[] = [];

        for (const log of logs) {
          const decoded = decodeBridgeLog(log);
          if (!decoded) continue;

          const base = {
            type: decoded.eventName,
            blockNumber: decoded.blockNumber,
            txHash: decoded.txHash,
          };

          const args = decoded.args;

          if (decoded.eventName === "release_request_received") {
            const amountSats = String(args.amount ?? "0");
            pegouts.push({
              ...base,
              sender: args.sender,
              btcDestinationAddress: args.btcDestinationAddress,
              amountSatoshis: amountSats,
              amountRbtc: satoshisToRbtc(amountSats),
            });
          } else if (decoded.eventName === "release_request_rejected") {
            const amountSats = String(args.amount ?? "0");
            pegouts.push({
              ...base,
              sender: args.sender,
              amountSatoshis: amountSats,
              amountRbtc: satoshisToRbtc(amountSats),
              reason: args.reason,
            });
          } else if (decoded.eventName === "release_requested") {
            const amountSats = String(args.amount ?? "0");
            pegouts.push({
              ...base,
              rskTxHash: args.rskTxHash,
              btcTxHash: args.btcTxHash,
              amountSatoshis: amountSats,
              amountRbtc: satoshisToRbtc(amountSats),
            });
          } else if (
            decoded.eventName === "batch_pegout_created" ||
            decoded.eventName === "pegout_transaction_created"
          ) {
            pegouts.push({
              ...base,
              btcTxHash: args.btcTxHash,
              releaseRskTxHashes: args.releaseRskTxHashes ?? null,
              btcTxSerialized: args.btcTxSerialized ?? null,
            });
          } else if (decoded.eventName === "pegout_confirmed") {
            pegouts.push({
              ...base,
              btcTxHash: args.btcTxHash,
              pegoutCreationRskBlockNumber: args.pegoutCreationRskBlockNumber,
            });
          } else if (decoded.eventName === "release_btc") {
            pegouts.push({
              ...base,
              releaseRskTxHash: args.releaseRskTxHash,
              btcRawTransaction: args.btcRawTransaction,
            });
          }
        }

        return toolResult({
          network: net,
          fromBlock: from,
          toBlock: to,
          count: pegouts.length,
          pegouts,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── bridge_get_transaction ────────────────────────────────────────────────
  server.tool(
    "bridge_get_transaction",
    "Decode a specific bridge transaction by hash. Returns the bridge method called and all bridge events emitted, with decoded arguments.",
    {
      network,
      txHash: z.string().describe("Transaction hash (0x-prefixed)"),
    },
    async ({ network: net, txHash }) => {
      try {
        const provider = getProvider(net);
        const parser = new BridgeTransactionParser(provider);
        const tx = await parser.getBridgeTransactionByTxHash(txHash);

        if (!tx) {
          return toolResult({
            found: false,
            txHash,
            reason: "Transaction not found or is not a bridge transaction",
          });
        }

        return toolResult({
          found: true,
          network: net,
          txHash: tx.txHash,
          sender: tx.sender,
          blockNumber: tx.blockNumber,
          blockTimestamp: tx.blockTimestamp,
          method: tx.method,
          events: tx.events,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── bridge_get_state ──────────────────────────────────────────────────────
  server.tool(
    "bridge_get_state",
    "Get current Rootstock bridge state: federation address, BTC chain height, locking cap, and active powpeg redeem script.",
    {
      network,
    },
    async ({ network: net }) => {
      try {
        const [heightResult, lockingCapResult, federationAddrResult, redeemScriptResult] =
          await Promise.all([
            callBridgeFn(net, "getBtcBlockchainBestChainHeight"),
            callBridgeFn(net, "getLockingCap"),
            callBridgeFn(net, "getFederationAddress"),
            callBridgeFn(net, "getActivePowpegRedeemScript").catch(() => null),
          ]);

        const lockingCapSats = String(lockingCapResult[0]);

        return toolResult({
          network: net,
          btcChainHeight: Number(heightResult[0]),
          federationBtcAddress: federationAddrResult[0],
          lockingCapSatoshis: lockingCapSats,
          lockingCapRbtc: satoshisToRbtc(lockingCapSats),
          activePowpegRedeemScript: redeemScriptResult ? redeemScriptResult[0] : null,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── bridge_get_federation ─────────────────────────────────────────────────
  server.tool(
    "bridge_get_federation",
    "Get current and retiring federation details: address, size, threshold, creation info, and individual federator public keys.",
    {
      network,
    },
    async ({ network: net }) => {
      try {
        const [addressResult, sizeResult, thresholdResult, creationTimeResult, creationBlockResult] =
          await Promise.all([
            callBridgeFn(net, "getFederationAddress"),
            callBridgeFn(net, "getFederationSize"),
            callBridgeFn(net, "getFederationThreshold"),
            callBridgeFn(net, "getFederationCreationTime"),
            callBridgeFn(net, "getFederationCreationBlockNumber"),
          ]);

        const size = Number(sizeResult[0]);
        const keyPromises = Array.from({ length: size }, (_, i) =>
          callBridgeFn(net, "getFederatorPublicKeyOfType", [i, "btc"]).catch(() => null)
        );
        const keyResults = await Promise.all(keyPromises);
        const members = keyResults.map((r, i) => ({
          index: i,
          btcPublicKey: r ? String(r[0]) : null,
        }));

        // Check for retiring federation
        const retiringAddrResult = await callBridgeFn(net, "getRetiringFederationAddress").catch(
          () => null
        );
        const retiringAddress = retiringAddrResult ? String(retiringAddrResult[0]) : null;

        let retiringFederation: unknown = null;
        if (retiringAddress) {
          const [retSize, retThreshold, retCreationTime, retCreationBlock] = await Promise.all([
            callBridgeFn(net, "getRetiringFederationSize").catch(() => null),
            callBridgeFn(net, "getRetiringFederationThreshold").catch(() => null),
            callBridgeFn(net, "getRetiringFederationCreationTime").catch(() => null),
            callBridgeFn(net, "getFederationCreationBlockNumber").catch(() => null),
          ]);

          const retSizeNum = retSize ? Number(retSize[0]) : 0;
          const retKeyPromises = Array.from({ length: retSizeNum }, (_, i) =>
            callBridgeFn(net, "getRetiringFederatorPublicKeyOfType", [i, "btc"]).catch(() => null)
          );
          const retKeyResults = await Promise.all(retKeyPromises);

          retiringFederation = {
            address: retiringAddress,
            size: retSizeNum,
            threshold: retThreshold ? Number(retThreshold[0]) : null,
            creationTime: retCreationTime ? Number(retCreationTime[0]) : null,
            creationBlockNumber: retCreationBlock ? Number(retCreationBlock[0]) : null,
            members: retKeyResults.map((r, i) => ({
              index: i,
              btcPublicKey: r ? String(r[0]) : null,
            })),
          };
        }

        return toolResult({
          network: net,
          address: String(addressResult[0]),
          size,
          threshold: Number(thresholdResult[0]),
          creationTime: Number(creationTimeResult[0]),
          creationBlockNumber: Number(creationBlockResult[0]),
          members,
          retiringFederation,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
