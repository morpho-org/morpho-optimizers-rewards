import { BigNumber, providers } from "ethers";
import { Optional } from "../helpers/types";
import { MarketEmission } from "../utils";

export interface EpochConfig {
  id: string;
  snapshotBlock?: number;
  initialTimestamp: BigNumber;
  finalTimestamp: BigNumber;
  initialBlock?: number;
  finalBlock?: number;
  totalEmission: BigNumber;
  epochName: string;

  protocolDistribution: {
    [protocol: string]: BigNumber; // the percentage of tokens distributed to users of Morpho-protocol in bps
  };
}

export interface AgeConfig {
  ageName: string;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  distribution: (
    epoch: EpochConfig,
    provider?: providers.Provider
  ) => Promise<{ marketsEmissions: { [p: string]: Optional<MarketEmission> } }>;
  subgraphUrl: string;
  epochs: EpochConfig[];
}
