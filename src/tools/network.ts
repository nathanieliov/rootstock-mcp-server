import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcCall } from "../rpc-client.js";
import { hexToNumber, toolResult, toolError } from "../utils.js";

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
}
