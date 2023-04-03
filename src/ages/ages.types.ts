import { BigNumber, providers } from "ethers";
import { Optional } from "../helpers/types";
import { MarketEmission } from "../utils";
import { AgeDistribution } from "./distributions/distributions.types";

export interface EpochConfig {
  number: number;
  snapshotProposal?: string;
  snapshotBlock?: number | null;
  initialTimestamp: BigNumber;
  finalTimestamp: BigNumber;
  initialBlock?: number | null;
  finalBlock?: number | null;
  totalEmission: BigNumber;
  epochName: string;
  protocolDistribution?: ProtocolDistribution | null;
}

export interface ProtocolDistribution {
  [protocol: string]: BigNumber; // the percentage of tokens distributed to users of Morpho-protocol in bps
}

export interface AgeConfig {
  ageName: string;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  distribution: (
    age: AgeDistribution,
    epoch: EpochConfig,
    provider?: providers.Provider
  ) => Promise<{ marketsEmissions: { [p: string]: Optional<MarketEmission> } }>;
  epochs: EpochConfig[];
}
