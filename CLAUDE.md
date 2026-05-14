# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # compile TypeScript → dist/
npm run dev         # run directly with tsx (no build needed, for development)
npm start           # run compiled server (requires build first)
```

There is no test suite yet. Type-check only:
```bash
npx tsc --noEmit
```

## Architecture

This is a **stdio MCP server** — it communicates over stdin/stdout using the MCP protocol, not HTTP. It is meant to be registered in a Claude client config (Claude Code or Claude Desktop), not run as a long-lived service.

### Request flow

```
Claude client → MCP stdio transport → McpServer (index.ts)
                                            ↓
                                   register*Tools() modules
                                            ↓
                                   rpcCall() → Rootstock JSON-RPC endpoint
```

### Key files

| File | Role |
|------|------|
| `src/index.ts` | Entry point: validates env vars, creates `McpServer`, registers all tool groups, connects stdio transport |
| `src/rpc-client.ts` | `rpcCall<T>(network, method, params)` — the single function all tools use to talk to the node |
| `src/types.ts` | `Network` type (`"mainnet" \| "testnet"`) and JSON-RPC envelope types |
| `src/utils.ts` | Shared formatters (`formatBlock`, `formatTransaction`, `weiToRbtc`, `satoshisToRbtc`) and MCP response helpers (`toolResult`, `toolError`) |
| `src/utils/bridge-abi.ts` | Bridge-specific: topic hash maps, `decodeBridgeLog`, `callBridgeFn`, `fetchLogsChunked` |
| `src/utils/block-range.ts` | `getFromBlockForDays` — converts a day count to a `fromBlock` hex value using 30s RSK block time |

### Tool registration pattern

Each domain module exports a single `register*Tools(server: McpServer)` function. All tool inputs are validated with Zod. Every tool returns `toolResult(data)` on success or `toolError(e)` on failure — both return the MCP `content` array shape.

```typescript
server.tool("tool_name", "description", { /* zod schema */ }, async (args) => {
  try {
    const data = await rpcCall(args.network, "eth_someMethod", [...]);
    return toolResult(data);
  } catch (e) {
    return toolError(e);
  }
});
```

### Bridge tools specifics

The bridge module (`src/tools/bridge.ts`) is more complex than the others:

- **Log-based tools** (`bridge_get_pegins`, `bridge_get_pegouts`): use `fetchLogsChunked` which splits the block range into 1000-block chunks (10 in parallel) to avoid RPC result-size limits.
- **Call-based tool** (`bridge_get_state`, `bridge_get_federation`): use `callBridgeFn` which ABI-encodes a call to the bridge precompile at its fixed address (`BRIDGE_ADDRESS` from `@rsksmart/rsk-precompiled-abis`).
- **Parser-based tool** (`bridge_get_transaction`): uses `@rsksmart/bridge-transaction-parser` with an `ethers` `JsonRpcProvider`. This is the only tool that creates a provider directly — all others go through `rpcCall`.
- `@rsksmart/rsk-precompiled-abis` is a CJS module, loaded via `createRequire` to interop with the ESM project.

### Adding a new tool

1. Add a `register*Tools(server)` function to an existing domain file in `src/tools/` (or create a new one for a new domain).
2. Import and call it in `src/index.ts`.
3. Use `rpcCall` for JSON-RPC calls; use `callBridgeFn` for bridge precompile calls; use `fetchLogsChunked` for event log queries over wide block ranges.
4. All monetary values from the bridge are in satoshis (use `satoshisToRbtc`); EVM balances are in wei hex (use `weiToRbtc`).
