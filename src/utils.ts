export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

export function weiToRbtc(weiHex: string): string {
  const wei = BigInt(weiHex);
  const rbtc = Number(wei) / 1e18;
  return rbtc.toFixed(8);
}

export function normalizeBlockTag(tag: string): string {
  if (tag === "latest" || tag === "earliest" || tag === "pending") return tag;
  if (tag.startsWith("0x")) return tag;
  if (/^\d+$/.test(tag)) return `0x${parseInt(tag, 10).toString(16)}`;
  return tag;
}

export function formatBlock(block: Record<string, unknown>): Record<string, unknown> {
  return {
    ...block,
    number: block.number ? hexToNumber(block.number as string) : null,
    timestamp: block.timestamp
      ? new Date(hexToNumber(block.timestamp as string) * 1000).toISOString()
      : null,
    gasLimit: block.gasLimit ? hexToNumber(block.gasLimit as string) : null,
    gasUsed: block.gasUsed ? hexToNumber(block.gasUsed as string) : null,
    size: block.size ? hexToNumber(block.size as string) : null,
    difficulty: block.difficulty ? hexToNumber(block.difficulty as string) : null,
  };
}

export function formatTransaction(tx: Record<string, unknown>): Record<string, unknown> {
  return {
    ...tx,
    blockNumber: tx.blockNumber ? hexToNumber(tx.blockNumber as string) : null,
    transactionIndex: tx.transactionIndex ? hexToNumber(tx.transactionIndex as string) : null,
    nonce: tx.nonce !== undefined ? hexToNumber(tx.nonce as string) : null,
    gas: tx.gas ? hexToNumber(tx.gas as string) : null,
  };
}

export function satoshisToRbtc(satoshis: bigint | string): string {
  const sats = typeof satoshis === "string" ? BigInt(satoshis) : satoshis;
  const rbtc = Number(sats) / 1e8;
  return rbtc.toFixed(8);
}

export function toolResult(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function toolError(error: unknown): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}
