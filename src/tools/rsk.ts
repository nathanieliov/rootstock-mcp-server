import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { normalizeBlockTag, toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

export function registerRskTools(server: McpServer): void {
  server.tool(
    "rsk_get_protocol_version",
    "Get the Rootstock protocol version (RSK-specific method)",
    { network },
    async ({ network: net }) => {
      try {
        const version = await rpcCall<string>(net, "rsk_protocolVersion", []);
        return toolResult({ network: net, protocolVersion: version });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "rsk_get_raw_transaction_receipt",
    "Get the raw (RLP-encoded) transaction receipt by hash. Useful for SPV proofs (RSK-specific).",
    {
      network,
      txHash: z.string().describe("Transaction hash (0x-prefixed)"),
    },
    async ({ network: net, txHash }) => {
      try {
        const receipt = await rpcCall<string | null>(
          net,
          "rsk_getRawTransactionReceiptByHash",
          [txHash]
        );
        if (!receipt) return toolResult({ found: false, txHash });
        return toolResult({ network: net, txHash, rawReceipt: receipt });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "rsk_get_transaction_receipt_nodes",
    "Get the Merkle trie nodes for a transaction receipt, used for SPV verification (RSK-specific)",
    {
      network,
      txHash: z.string().describe("Transaction hash (0x-prefixed)"),
    },
    async ({ network: net, txHash }) => {
      try {
        const nodes = await rpcCall<string[] | null>(
          net,
          "rsk_getTransactionReceiptNodesByHash",
          [txHash]
        );
        if (!nodes) return toolResult({ found: false, txHash });
        return toolResult({ network: net, txHash, nodeCount: nodes.length, nodes });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "rsk_get_raw_block_header_by_number",
    "Get the raw (RLP-encoded) block header by block number (RSK-specific)",
    {
      network,
      blockNumber: z
        .string()
        .default("latest")
        .describe("Block number (decimal, hex, or 'latest')"),
    },
    async ({ network: net, blockNumber }) => {
      try {
        const tag = normalizeBlockTag(blockNumber);
        const header = await rpcCall<string | null>(
          net,
          "rsk_getRawBlockHeaderByNumber",
          [tag]
        );
        if (!header) return toolResult({ found: false, blockNumber: tag });
        return toolResult({ network: net, blockNumber: tag, rawHeader: header });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "rsk_get_raw_block_header_by_hash",
    "Get the raw (RLP-encoded) block header by block hash (RSK-specific)",
    {
      network,
      blockHash: z.string().describe("Block hash (0x-prefixed)"),
    },
    async ({ network: net, blockHash }) => {
      try {
        const header = await rpcCall<string | null>(
          net,
          "rsk_getRawBlockHeaderByHash",
          [blockHash]
        );
        if (!header) return toolResult({ found: false, blockHash });
        return toolResult({ network: net, blockHash, rawHeader: header });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
