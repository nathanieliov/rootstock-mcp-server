import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { explorerGet } from "../explorer-client.js";
import { toolResult, toolError } from "../utils.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

export function registerExplorerTools(server: McpServer): void {
  // ── explorer_get_stats ────────────────────────────────────────────────────
  server.tool(
    "explorer_get_stats",
    "Get Rootstock network statistics from the block explorer: total BTC locked in the bridge (TVL), gas price tiers, total transactions, total addresses, and RBTC market data.",
    { network },
    async ({ network: net }) => {
      try {
        const stats = await explorerGet(net, "/api/v2/stats");
        return toolResult({ network: net, ...stats as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── explorer_get_address ──────────────────────────────────────────────────
  server.tool(
    "explorer_get_address",
    "Get rich address information from the block explorer: balance, contract status, source verification, token holdings, reputation tags, and transaction counts. Provides more context than get_balance alone.",
    {
      network,
      address: z.string().describe("Rootstock address (0x-prefixed)"),
    },
    async ({ network: net, address }) => {
      try {
        const data = await explorerGet(net, `/api/v2/addresses/${address}`);
        return toolResult({ network: net, ...data as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── explorer_get_transactions ─────────────────────────────────────────────
  server.tool(
    "explorer_get_transactions",
    "Get the transaction history for an address from the block explorer. Returns decoded inputs, method names, transaction type labels (rootstock_bridge, rootstock_remasc), fee breakdown, and status. Supports cursor-based pagination.",
    {
      network,
      address: z.string().describe("Rootstock address (0x-prefixed)"),
      filter: z
        .enum(["to", "from"])
        .optional()
        .describe("Filter by direction: 'to' (received) or 'from' (sent)"),
      nextPageParams: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response's next_page_params (JSON-encoded)"),
    },
    async ({ network: net, address, filter, nextPageParams }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        if (nextPageParams) {
          const parsed = JSON.parse(nextPageParams) as Record<string, string>;
          for (const [k, v] of Object.entries(parsed)) params[k] = v;
        }
        const data = await explorerGet(net, `/api/v2/addresses/${address}/transactions`, params);
        return toolResult({ network: net, ...data as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── explorer_get_internal_txs ─────────────────────────────────────────────
  server.tool(
    "explorer_get_internal_txs",
    "Get internal transactions (call traces) for an address from the block explorer. Shows value transfers and contract calls that don't appear in the main transaction list, including calls into and out of the bridge precompile.",
    {
      network,
      address: z.string().describe("Rootstock address (0x-prefixed)"),
      nextPageParams: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response's next_page_params (JSON-encoded)"),
    },
    async ({ network: net, address, nextPageParams }) => {
      try {
        const params: Record<string, string> = {};
        if (nextPageParams) {
          const parsed = JSON.parse(nextPageParams) as Record<string, string>;
          for (const [k, v] of Object.entries(parsed)) params[k] = v;
        }
        const data = await explorerGet(
          net,
          `/api/v2/addresses/${address}/internal-transactions`,
          params
        );
        return toolResult({ network: net, ...data as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── explorer_get_token_info ───────────────────────────────────────────────
  server.tool(
    "explorer_get_token_info",
    "Get token metadata from the block explorer: name, symbol, decimals, total supply, holder count, exchange rate, and market cap for any ERC-20/ERC-721/ERC-1155 token on Rootstock.",
    {
      network,
      address: z.string().describe("Token contract address (0x-prefixed)"),
    },
    async ({ network: net, address }) => {
      try {
        const data = await explorerGet(net, `/api/v2/tokens/${address}`);
        return toolResult({ network: net, ...data as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // ── explorer_search ───────────────────────────────────────────────────────
  server.tool(
    "explorer_search",
    "Search the Rootstock block explorer across addresses, contracts, tokens, and public tags. Useful for looking up a contract name, finding a token by symbol, or resolving a known label to an address.",
    {
      network,
      query: z.string().describe("Search query — address, contract name, token symbol, or tag"),
    },
    async ({ network: net, query }) => {
      try {
        const data = await explorerGet(net, "/api/v2/search", { q: query });
        return toolResult({ network: net, ...data as object });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
