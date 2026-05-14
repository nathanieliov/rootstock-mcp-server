import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { normalizeBlockTag, toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

export function registerContractTools(server: McpServer): void {
  server.tool(
    "eth_call",
    "Execute a read-only call against a smart contract. Does not submit a transaction or cost gas.",
    {
      network,
      to: z.string().describe("Contract address to call"),
      data: z.string().describe("ABI-encoded function selector + arguments (hex)"),
      from: z.string().optional().describe("Optional caller address (affects msg.sender in view functions)"),
      blockTag: z.string().default("latest").describe("Block to execute against"),
    },
    async ({ network: net, to, data, from, blockTag }) => {
      try {
        const tag = normalizeBlockTag(blockTag);
        const callObj: Record<string, string> = { to, data };
        if (from) callObj.from = from;
        const result = await rpcCall<string>(net, "eth_call", [callObj, tag]);
        return toolResult({ network: net, to, result, blockTag: tag });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_logs",
    "Query event logs emitted by smart contracts on the Rootstock blockchain",
    {
      network,
      fromBlock: z
        .string()
        .default("latest")
        .describe("Start block ('latest', 'earliest', or block number)"),
      toBlock: z
        .string()
        .default("latest")
        .describe("End block ('latest', 'earliest', or block number)"),
      address: z.string().optional().describe("Filter by emitting contract address"),
      topics: z
        .array(z.string().nullable())
        .optional()
        .describe("Event topics filter (array of 32-byte hex strings or null for wildcard)"),
    },
    async ({ network: net, fromBlock, toBlock, address, topics }) => {
      try {
        const filter: Record<string, unknown> = {
          fromBlock: normalizeBlockTag(fromBlock),
          toBlock: normalizeBlockTag(toBlock),
        };
        if (address) filter.address = address;
        if (topics) filter.topics = topics;

        const logs = await rpcCall<unknown[]>(net, "eth_getLogs", [filter]);
        return toolResult({ network: net, count: logs.length, logs });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
