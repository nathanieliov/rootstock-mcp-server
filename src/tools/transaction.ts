import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { hexToNumber, normalizeBlockTag, formatTransaction, toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

export function registerTransactionTools(server: McpServer): void {
  server.tool(
    "get_transaction",
    "Get a transaction by its hash",
    {
      network,
      txHash: z.string().describe("Transaction hash (0x-prefixed)"),
    },
    async ({ network: net, txHash }) => {
      try {
        const tx = await rpcCall<Record<string, unknown> | null>(
          net,
          "eth_getTransactionByHash",
          [txHash]
        );
        if (!tx) return toolResult({ found: false, txHash });
        return toolResult(formatTransaction(tx));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_transaction_receipt",
    "Get the receipt of a confirmed transaction (includes logs, gas used, and success/failure status)",
    {
      network,
      txHash: z.string().describe("Transaction hash (0x-prefixed)"),
    },
    async ({ network: net, txHash }) => {
      try {
        const receipt = await rpcCall<Record<string, unknown> | null>(
          net,
          "eth_getTransactionReceipt",
          [txHash]
        );
        if (!receipt) return toolResult({ found: false, txHash, note: "Transaction may be pending" });
        return toolResult({
          ...receipt,
          blockNumber: receipt.blockNumber ? hexToNumber(receipt.blockNumber as string) : null,
          transactionIndex: receipt.transactionIndex
            ? hexToNumber(receipt.transactionIndex as string)
            : null,
          gasUsed: receipt.gasUsed ? hexToNumber(receipt.gasUsed as string) : null,
          cumulativeGasUsed: receipt.cumulativeGasUsed
            ? hexToNumber(receipt.cumulativeGasUsed as string)
            : null,
          status: receipt.status === "0x1" ? "success" : receipt.status === "0x0" ? "failed" : receipt.status,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "estimate_gas",
    "Estimate the gas required for a transaction without submitting it",
    {
      network,
      to: z.string().optional().describe("Recipient address (omit for contract deployment)"),
      from: z.string().optional().describe("Sender address"),
      value: z.string().optional().describe("Value to send in wei (hex, e.g. '0xDE0B6B3A7640000' for 1 RBTC)"),
      data: z.string().optional().describe("ABI-encoded transaction data (hex)"),
      blockTag: z.string().default("latest").describe("Block tag for the estimation context"),
    },
    async ({ network: net, to, from, value, data, blockTag }) => {
      try {
        const txObj: Record<string, string> = {};
        if (from) txObj.from = from;
        if (to) txObj.to = to;
        if (value) txObj.value = value;
        if (data) txObj.data = data;

        const gasHex = await rpcCall<string>(net, "eth_estimateGas", [
          txObj,
          normalizeBlockTag(blockTag),
        ]);
        return toolResult({ network: net, estimatedGas: hexToNumber(gasHex), estimatedGasHex: gasHex });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "send_raw_transaction",
    "Broadcast a signed raw transaction to the Rootstock network",
    {
      network,
      signedTx: z.string().describe("Signed transaction in RLP-encoded hex (0x-prefixed)"),
    },
    async ({ network: net, signedTx }) => {
      try {
        const txHash = await rpcCall<string>(net, "eth_sendRawTransaction", [signedTx]);
        return toolResult({ network: net, txHash, status: "submitted" });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_transaction_by_block_and_index",
    "Get a transaction by its position within a block",
    {
      network,
      blockNumber: z
        .string()
        .describe("Block number (decimal, hex, or 'latest')"),
      index: z.number().int().min(0).describe("Transaction index within the block (0-based)"),
    },
    async ({ network: net, blockNumber, index }) => {
      try {
        const tag = normalizeBlockTag(blockNumber);
        const indexHex = `0x${index.toString(16)}`;
        const tx = await rpcCall<Record<string, unknown> | null>(
          net,
          "eth_getTransactionByBlockNumberAndIndex",
          [tag, indexHex]
        );
        if (!tx) return toolResult({ found: false, blockNumber: tag, index });
        return toolResult(formatTransaction(tx));
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
