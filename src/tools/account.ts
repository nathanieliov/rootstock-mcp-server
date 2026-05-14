import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { hexToNumber, normalizeBlockTag, weiToRbtc, toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

const blockTag = z
  .string()
  .default("latest")
  .describe("Block tag ('latest', 'earliest', or decimal/hex block number)");

export function registerAccountTools(server: McpServer): void {
  server.tool(
    "get_balance",
    "Get the RBTC balance of an address on the Rootstock blockchain",
    {
      network,
      address: z.string().describe("Rootstock/Ethereum address (0x-prefixed)"),
      blockTag,
    },
    async ({ network: net, address, blockTag: tag }) => {
      try {
        const normalizedTag = normalizeBlockTag(tag);
        const balanceHex = await rpcCall<string>(net, "eth_getBalance", [address, normalizedTag]);
        return toolResult({
          network: net,
          address,
          balanceWei: BigInt(balanceHex).toString(),
          balanceRBTC: weiToRbtc(balanceHex),
          blockTag: normalizedTag,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_transaction_count",
    "Get the number of transactions sent from an address (nonce). Useful before signing a new transaction.",
    {
      network,
      address: z.string().describe("Address to query"),
      blockTag,
    },
    async ({ network: net, address, blockTag: tag }) => {
      try {
        const normalizedTag = normalizeBlockTag(tag);
        const countHex = await rpcCall<string>(net, "eth_getTransactionCount", [
          address,
          normalizedTag,
        ]);
        return toolResult({
          network: net,
          address,
          nonce: hexToNumber(countHex),
          blockTag: normalizedTag,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_code",
    "Get the bytecode deployed at a contract address. Returns '0x' for externally owned accounts.",
    {
      network,
      address: z.string().describe("Contract address to inspect"),
      blockTag,
    },
    async ({ network: net, address, blockTag: tag }) => {
      try {
        const normalizedTag = normalizeBlockTag(tag);
        const code = await rpcCall<string>(net, "eth_getCode", [address, normalizedTag]);
        return toolResult({
          network: net,
          address,
          code,
          isContract: code !== "0x" && code !== "0x0",
          codeSizeBytes: code.length > 2 ? (code.length - 2) / 2 : 0,
          blockTag: normalizedTag,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_storage_at",
    "Read a storage slot from a contract address",
    {
      network,
      address: z.string().describe("Contract address"),
      slot: z.string().describe("Storage slot index (hex, e.g. '0x0' for slot 0)"),
      blockTag,
    },
    async ({ network: net, address, slot, blockTag: tag }) => {
      try {
        const normalizedTag = normalizeBlockTag(tag);
        const value = await rpcCall<string>(net, "eth_getStorageAt", [
          address,
          slot,
          normalizedTag,
        ]);
        return toolResult({ network: net, address, slot, value, blockTag: normalizedTag });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
