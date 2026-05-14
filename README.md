# rootstock-mcp

MCP server for querying the Rootstock blockchain via JSON-RPC. Supports both mainnet and testnet.

## Setup

```bash
npm install
cp .env.example .env   # add your API keys
npm run build
```

## Environment Variables

```
RSK_MAINNET_URL=https://rpc.mainnet.rootstock.io/<YOUR_API_KEY>
RSK_TESTNET_URL=https://rpc.testnet.rootstock.io/<YOUR_API_KEY>
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_network_info` | Chain ID, client version, sync status, peer count |
| `get_gas_price` | Current gas price in wei and Gwei |
| `get_block_number` | Latest block number |
| `get_block_by_number` | Block details by number or `latest` |
| `get_block_by_hash` | Block details by hash |
| `get_uncle_count_by_block_number` | Uncle count for a block |
| `get_balance` | RBTC balance of an address |
| `get_transaction_count` | Nonce for an address |
| `get_code` | Contract bytecode at an address |
| `get_storage_at` | Storage slot value |
| `get_transaction` | Transaction by hash |
| `get_transaction_receipt` | Receipt with logs, gas used, and status |
| `estimate_gas` | Gas estimate for a transaction |
| `send_raw_transaction` | Broadcast a signed transaction |
| `get_transaction_by_block_and_index` | Transaction by block + index |
| `eth_call` | Read-only contract call |
| `get_logs` | Query event logs |
| `rsk_get_protocol_version` | Rootstock protocol version |
| `rsk_get_raw_transaction_receipt` | Raw RLP-encoded receipt (SPV) |
| `rsk_get_transaction_receipt_nodes` | Receipt Merkle trie nodes (SPV) |
| `rsk_get_raw_block_header_by_number` | Raw block header by number |
| `rsk_get_raw_block_header_by_hash` | Raw block header by hash |

All tools accept a `network` parameter (`"mainnet"` or `"testnet"`, defaults to `"mainnet"`).

## Add to Claude Code

Add this to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "rootstock": {
      "command": "node",
      "args": ["/Users/nathaniel/dev/workspace/projects/rootstock-mcp/dist/index.js"],
      "env": {
        "RSK_MAINNET_URL": "https://rpc.mainnet.rootstock.io/<YOUR_API_KEY>",
        "RSK_TESTNET_URL": "https://rpc.testnet.rootstock.io/<YOUR_API_KEY>"
      }
    }
  }
}
```

## Add to Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rootstock": {
      "command": "node",
      "args": ["/Users/nathaniel/dev/workspace/projects/rootstock-mcp/dist/index.js"],
      "env": {
        "RSK_MAINNET_URL": "https://rpc.mainnet.rootstock.io/<YOUR_API_KEY>",
        "RSK_TESTNET_URL": "https://rpc.testnet.rootstock.io/<YOUR_API_KEY>"
      }
    }
  }
}
```
