# rootstock-mcp

**Give Claude direct access to the Rootstock blockchain.**

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that connects Claude to the Rootstock blockchain via JSON-RPC. Query balances, inspect transactions, monitor the BTC↔RBTC bridge, decode smart contracts, and more — all in plain English, no code required.

> **Rootstock (RSK)** is a Bitcoin sidechain with full EVM compatibility. It lets you run smart contracts secured by Bitcoin's hashrate, and bridges native BTC to RBTC (1:1 peg) through a federated two-way peg called the PowPeg.

---

## What can you ask?

Once installed, you can have conversations like these directly in Claude:

---

**Bridge monitoring**
> "How many BTC were pegged into Rootstock in the last 7 days? Were any pegins rejected?"

Claude calls `bridge_get_pegins` and returns a breakdown of successful, rejected, and unrefundable pegins with amounts and transaction hashes.

---

**Transaction debugging**
> "Why did this transaction fail? `0xabc123...` — what was the gas used and what events were emitted?"

Claude calls `get_transaction_receipt` and explains the failure status, logs, and gas consumption in plain language.

---

**Portfolio lookup**
> "What's the RBTC balance of `0xYourAddress`? Also check it on testnet."

Claude calls `get_balance` twice (mainnet + testnet) and formats the results in both wei and RBTC.

---

**Bridge health check**
> "What's the current Rootstock bridge state? Who controls the federation and what's the locking cap?"

Claude calls `bridge_get_state` and `bridge_get_federation` and explains the multi-sig federation setup and BTC collateral limit.

---

**Smart contract inspection**
> "Is there a contract deployed at `0xContractAddress`? How big is its bytecode?"

Claude calls `get_code` and reports whether it's a contract, its size in bytes, and the raw bytecode.

---

**Gas estimation**
> "Estimate the gas cost to send 0.1 RBTC to `0xRecipient` at current gas prices."

Claude calls `get_gas_price` and `estimate_gas`, then calculates the estimated cost in RBTC.

---

## Quick Start

### 1. Get a Rootstock API key

Sign up at [dashboard.rpc.rootstock.io](https://dashboard.rpc.rootstock.io) to get free API keys for both mainnet and testnet.

### 2. Clone and build

```bash
git clone https://github.com/your-username/rootstock-mcp.git
cd rootstock-mcp
npm install
cp .env.example .env
```

Edit `.env` and paste your API keys:

```env
RSK_MAINNET_URL=https://rpc.mainnet.rootstock.io/YOUR_API_KEY
RSK_TESTNET_URL=https://rpc.testnet.rootstock.io/YOUR_API_KEY
```

Then build:

```bash
npm run build
```

### 3. Register with Claude

**Claude Code** — add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "rootstock": {
      "command": "node",
      "args": ["/absolute/path/to/rootstock-mcp/dist/index.js"],
      "env": {
        "RSK_MAINNET_URL": "https://rpc.mainnet.rootstock.io/YOUR_API_KEY",
        "RSK_TESTNET_URL": "https://rpc.testnet.rootstock.io/YOUR_API_KEY"
      }
    }
  }
}
```

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rootstock": {
      "command": "node",
      "args": ["/absolute/path/to/rootstock-mcp/dist/index.js"],
      "env": {
        "RSK_MAINNET_URL": "https://rpc.mainnet.rootstock.io/YOUR_API_KEY",
        "RSK_TESTNET_URL": "https://rpc.testnet.rootstock.io/YOUR_API_KEY"
      }
    }
  }
}
```

Replace `/absolute/path/to/rootstock-mcp` with the actual path where you cloned the repo (e.g. run `pwd` inside the project directory).

### 4. Restart Claude and start asking

Open Claude and try: *"Use the Rootstock MCP to check the current gas price on mainnet."*

---

## Tools Reference

All tools accept a `network` parameter (`"mainnet"` or `"testnet"`, defaults to `"mainnet"`).

### Network

| Tool | Description |
|------|-------------|
| `get_network_info` | Chain ID, client version, sync status, peer count |
| `get_gas_price` | Current gas price in wei and Gwei |

### Blockchain

| Tool | Description |
|------|-------------|
| `get_block_number` | Latest block number |
| `get_block_by_number` | Block details by number or `latest` |
| `get_block_by_hash` | Block details by hash |
| `get_uncle_count_by_block_number` | Uncle/sibling count for a block |

### Account

| Tool | Description |
|------|-------------|
| `get_balance` | RBTC balance of an address (wei + RBTC) |
| `get_transaction_count` | Nonce for an address — useful before signing |
| `get_code` | Contract bytecode at an address (`0x` = EOA) |
| `get_storage_at` | Raw value of a storage slot |

### Transaction

| Tool | Description |
|------|-------------|
| `get_transaction` | Transaction by hash |
| `get_transaction_receipt` | Receipt with logs, gas used, and success/failure status |
| `estimate_gas` | Gas estimate for a transaction (no broadcast) |
| `send_raw_transaction` | Broadcast a pre-signed transaction |
| `get_transaction_by_block_and_index` | Transaction by block number + position index |

### Contract

| Tool | Description |
|------|-------------|
| `eth_call` | Read-only call against a contract (no gas cost) |
| `get_logs` | Query event logs with block range + topic filters |

### RSK-Specific (SPV / Proofs)

| Tool | Description |
|------|-------------|
| `rsk_get_protocol_version` | Rootstock node protocol version |
| `rsk_get_raw_transaction_receipt` | RLP-encoded receipt for SPV proofs |
| `rsk_get_transaction_receipt_nodes` | Merkle trie nodes for receipt SPV verification |
| `rsk_get_raw_block_header_by_number` | Raw RLP block header by block number |
| `rsk_get_raw_block_header_by_hash` | Raw RLP block header by block hash |

### Bridge (BTC ↔ RBTC)

These tools query the Rootstock PowPeg bridge — the two-way peg that moves BTC onto Rootstock as RBTC.

| Tool | Description |
|------|-------------|
| `bridge_get_pegins` | BTC→RBTC events: successful, rejected, and unrefundable pegins over a date/block range |
| `bridge_get_pegouts` | RBTC→BTC full lifecycle: request received → batch created → confirmed → released |
| `bridge_get_transaction` | Decode any bridge transaction — method called + all bridge events emitted |
| `bridge_get_state` | Current bridge state: federation BTC address, locking cap, BTC chain height |
| `bridge_get_federation` | Active federation details: members, threshold, public keys, retiring federation |

---

## Development

```bash
npm run dev      # run directly with tsx (no build step needed)
npm run build    # compile TypeScript → dist/
npm start        # run compiled output
npx tsc --noEmit # type-check only
```

**Requirements:** Node.js 18+

---

## How it works

This is a **stdio MCP server** — it communicates over stdin/stdout with the Claude client, not over HTTP. The client spawns the process and exchanges JSON-RPC-style messages with it.

```
Claude ──► MCP stdio transport ──► McpServer
                                       │
                          ┌────────────┼────────────┐
                       network      bridge       account
                       tools        tools        tools
                          │            │            │
                          └────────────┴────────────┘
                                       │
                             rpcCall() to Rootstock node
```

---

## Contributing

Pull requests are welcome. To add a new tool:

1. Add a `register*Tools(server)` function to an existing file in `src/tools/` or create a new one
2. Import and call it in `src/index.ts`
3. Use `rpcCall` for standard JSON-RPC, `callBridgeFn` for bridge precompile calls, and `fetchLogsChunked` for log queries over wide block ranges
4. Monetary values from the bridge are in satoshis — use `satoshisToRbtc()`; EVM balances are in wei hex — use `weiToRbtc()`

See [CLAUDE.md](CLAUDE.md) for the full architecture guide.

---

## License

MIT
