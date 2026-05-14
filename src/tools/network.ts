import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { hexToNumber, toolResult, toolError } from "../utils.js";
import { HARDFORKS } from "../utils/hardforks.js";

const network = z
  .enum(["mainnet", "testnet"])
  .default("mainnet")
  .describe("Network to query (mainnet or testnet)");

export function registerNetworkTools(server: McpServer): void {
  server.tool(
    "get_network_info",
    "Get Rootstock network information: chain ID, client version, peer count, and sync status",
    { network },
    async ({ network: net }) => {
      try {
        const [netVersion, clientVersion, syncing, peerCount] = await Promise.all([
          rpcCall<string>(net, "net_version", []),
          rpcCall<string>(net, "web3_clientVersion", []),
          rpcCall<boolean | Record<string, string>>(net, "eth_syncing", []),
          rpcCall<string>(net, "net_peerCount", []),
        ]);
        return toolResult({
          network: net,
          chainId: parseInt(netVersion, 10),
          clientVersion,
          syncing,
          peerCount: hexToNumber(peerCount),
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_gas_price",
    "Get the current gas price on the Rootstock network",
    { network },
    async ({ network: net }) => {
      try {
        const gasPriceHex = await rpcCall<string>(net, "eth_gasPrice", []);
        const gasPriceWei = BigInt(gasPriceHex);
        return toolResult({
          network: net,
          gasPriceWei: gasPriceWei.toString(),
          gasPriceGwei: (Number(gasPriceWei) / 1e9).toFixed(4),
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_hardforks",
    "List all Rootstock network hardforks with their activation block heights and status. Identifies the last activated hardfork and its activation timestamp.",
    { network },
    async ({ network: net }) => {
      try {
        const [blockHex, clientVersion] = await Promise.all([
          rpcCall<string>(net, "eth_blockNumber", []),
          rpcCall<string>(net, "web3_clientVersion", []),
        ]);
        const currentBlock = hexToNumber(blockHex);

        const entries = HARDFORKS[net];

        const hardforks = entries.map((hf) => {
          if (hf.activationBlock === -1) {
            return { name: hf.name, activationBlock: null, status: "not_scheduled" as const };
          }
          const active = currentBlock >= hf.activationBlock;
          return {
            name: hf.name,
            activationBlock: hf.activationBlock,
            status: active ? ("active" as const) : ("pending" as const),
          };
        });

        const activeHardforks = hardforks.filter((hf) => hf.status === "active");
        const lastHardfork = activeHardforks.at(-1) ?? null;

        let lastHardforkActivatedAt: string | null = null;
        if (lastHardfork?.activationBlock != null) {
          const blockTag = `0x${lastHardfork.activationBlock.toString(16)}`;
          const block = await rpcCall<{ timestamp: string } | null>(
            net,
            "eth_getBlockByNumber",
            [blockTag, false]
          );
          if (block?.timestamp) {
            lastHardforkActivatedAt = new Date(
              hexToNumber(block.timestamp) * 1000
            ).toISOString();
          }
        }

        return toolResult({
          network: net,
          currentBlock,
          clientVersion,
          lastHardfork: lastHardfork
            ? {
                name: lastHardfork.name,
                activationBlock: lastHardfork.activationBlock,
                activatedAt: lastHardforkActivatedAt,
              }
            : null,
          hardforks,
        });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
