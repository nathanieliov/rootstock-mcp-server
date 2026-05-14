import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { hexToNumber, normalizeBlockTag, formatBlock, toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

const blockNumberParam = z
  .string()
  .default("latest")
  .describe("Block number (decimal integer, 0x-prefixed hex, 'latest', or 'earliest')");

export function registerBlockchainTools(server: McpServer): void {
  server.tool(
    "get_block_number",
    "Get the latest block number on the Rootstock blockchain",
    { network },
    async ({ network: net }) => {
      try {
        const hex = await rpcCall<string>(net, "eth_blockNumber", []);
        return toolResult({ network: net, blockNumber: hexToNumber(hex), blockNumberHex: hex });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_block_by_number",
    "Get a Rootstock block by number. Pass 'latest' for the most recent block.",
    {
      network,
      blockNumber: blockNumberParam,
      includeTransactions: z
        .boolean()
        .default(false)
        .describe("Return full transaction objects instead of just hashes"),
    },
    async ({ network: net, blockNumber, includeTransactions }) => {
      try {
        const tag = normalizeBlockTag(blockNumber);
        const block = await rpcCall<Record<string, unknown> | null>(
          net,
          "eth_getBlockByNumber",
          [tag, includeTransactions]
        );
        if (!block) return toolResult({ found: false, blockNumber: tag });
        return toolResult(formatBlock(block));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_block_by_hash",
    "Get a Rootstock block by its hash",
    {
      network,
      blockHash: z.string().describe("Block hash (0x-prefixed 32-byte hex)"),
      includeTransactions: z
        .boolean()
        .default(false)
        .describe("Return full transaction objects instead of just hashes"),
    },
    async ({ network: net, blockHash, includeTransactions }) => {
      try {
        const block = await rpcCall<Record<string, unknown> | null>(
          net,
          "eth_getBlockByHash",
          [blockHash, includeTransactions]
        );
        if (!block) return toolResult({ found: false, blockHash });
        return toolResult(formatBlock(block));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_uncle_count_by_block_number",
    "Get the number of uncle blocks for a given block number",
    { network, blockNumber: blockNumberParam },
    async ({ network: net, blockNumber }) => {
      try {
        const tag = normalizeBlockTag(blockNumber);
        const hex = await rpcCall<string>(net, "eth_getUncleCountByBlockNumber", [tag]);
        return toolResult({ network: net, blockNumber: tag, uncleCount: hexToNumber(hex) });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
