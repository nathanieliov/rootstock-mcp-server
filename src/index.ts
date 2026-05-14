import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerBlockchainTools } from "./tools/blockchain.js";
import { registerAccountTools } from "./tools/account.js";
import { registerTransactionTools } from "./tools/transaction.js";
import { registerContractTools } from "./tools/contract.js";
import { registerRskTools } from "./tools/rsk.js";
import { registerBridgeTools } from "./tools/bridge.js";
import { registerExplorerTools } from "./tools/explorer.js";

const REQUIRED_ENV = ["RSK_MAINNET_URL", "RSK_TESTNET_URL"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const server = new McpServer({
  name: "rootstock-mcp",
  version: "0.1.0",
});

registerNetworkTools(server);
registerBlockchainTools(server);
registerAccountTools(server);
registerTransactionTools(server);
registerContractTools(server);
registerRskTools(server);
registerBridgeTools(server);
registerExplorerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
