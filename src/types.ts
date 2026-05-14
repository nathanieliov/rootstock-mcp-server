export type Network = "mainnet" | "testnet";

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: RpcError;
}
