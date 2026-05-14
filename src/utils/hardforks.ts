import type { Network } from "../types.js";

export interface HardforkEntry {
  name: string;
  activationBlock: number; // -1 = not scheduled on this network
}

// Source: https://github.com/rsksmart/rskj/blob/master/rskj-core/src/main/resources/config/main.conf
//         https://github.com/rsksmart/rskj/blob/master/rskj-core/src/main/resources/config/testnet.conf
export const HARDFORKS: Record<Network, HardforkEntry[]> = {
  mainnet: [
    { name: "bahamas", activationBlock: 3_397 },
    { name: "afterBridgeSync", activationBlock: 370_000 },
    { name: "orchid", activationBlock: 729_000 },
    { name: "orchid060", activationBlock: 1_052_700 },
    { name: "wasabi100", activationBlock: 1_591_000 },
    { name: "twoToThree", activationBlock: 2_018_000 },
    { name: "papyrus200", activationBlock: 2_392_700 },
    { name: "iris300", activationBlock: 3_614_800 },
    { name: "hop400", activationBlock: 4_598_500 },
    { name: "hop401", activationBlock: 4_976_300 },
    { name: "fingerroot500", activationBlock: 5_468_000 },
    { name: "arrowhead600", activationBlock: 6_223_700 },
    { name: "arrowhead631", activationBlock: 6_549_300 },
    { name: "lovell700", activationBlock: 7_338_024 },
    { name: "reed800", activationBlock: 8_052_200 },
    { name: "reed810", activationBlock: -1 },
    { name: "vetiver900", activationBlock: 8_804_200 },
  ],
  testnet: [
    { name: "bahamas", activationBlock: 0 },
    { name: "afterBridgeSync", activationBlock: 114_000 },
    { name: "orchid", activationBlock: 0 },
    { name: "orchid060", activationBlock: 0 },
    { name: "wasabi100", activationBlock: 0 },
    { name: "twoToThree", activationBlock: 504_000 },
    { name: "papyrus200", activationBlock: 863_000 },
    { name: "iris300", activationBlock: 2_060_500 },
    { name: "hop400", activationBlock: 3_103_000 },
    { name: "hop401", activationBlock: 3_362_200 },
    { name: "fingerroot500", activationBlock: 4_015_800 },
    { name: "arrowhead600", activationBlock: 4_927_100 },
    { name: "arrowhead631", activationBlock: -1 },
    { name: "lovell700", activationBlock: 6_110_487 },
    { name: "reed800", activationBlock: 6_835_700 },
    { name: "reed810", activationBlock: 7_139_600 },
    { name: "vetiver900", activationBlock: 7_604_200 },
  ],
};
