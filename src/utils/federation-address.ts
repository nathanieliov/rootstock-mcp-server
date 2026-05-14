import { createRequire } from "node:module";
import type { Network } from "../types.js";

const require = createRequire(import.meta.url);

const parser = require("@rsksmart/powpeg-redeemscript-parser") as {
  getPowpegRedeemScript: (pubkeys: string[]) => Buffer;
  getP2shErpRedeemScript: (powpegPubkeys: string[], emergencyPubkeys: string[], csvValue: number) => Buffer;
  getAddressFromRedeemScript: (network: string, redeemScript: Buffer) => string;
  NETWORKS: { MAINNET: string; TESTNET: string; REGTEST: string };
};

export interface FederationAddresses {
  legacyAddress: string;
  legacyRedeemScript: string;
  erpAddress?: string;
  erpRedeemScript?: string;
}

function toParserNetwork(network: Network): string {
  return network === "mainnet" ? parser.NETWORKS.MAINNET : parser.NETWORKS.TESTNET;
}

export function computeFederationAddresses(
  btcPubkeys: string[],
  network: Network,
  emergencyPubkeys?: string[],
  csvValue?: number
): FederationAddresses {
  const net = toParserNetwork(network);
  const legacyScript = parser.getPowpegRedeemScript(btcPubkeys);

  const result: FederationAddresses = {
    legacyAddress: parser.getAddressFromRedeemScript(net, legacyScript),
    legacyRedeemScript: legacyScript.toString("hex"),
  };

  if (emergencyPubkeys && emergencyPubkeys.length > 0 && csvValue !== undefined) {
    try {
      const erpScript = parser.getP2shErpRedeemScript(btcPubkeys, emergencyPubkeys, csvValue);
      result.erpAddress = parser.getAddressFromRedeemScript(net, erpScript);
      result.erpRedeemScript = erpScript.toString("hex");
    } catch {
      // ERP computation fails when emergency keys or CSV value are unavailable
    }
  }

  return result;
}
