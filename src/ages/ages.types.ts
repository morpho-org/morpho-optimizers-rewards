import { BigNumber, providers } from "ethers";
import { Optional } from "../helpers/types";
import { MarketEmission } from "../utils";
import { AgeDistribution } from "./distributions/distributions.types";

export interface EpochConfig {
  id: string;
  epochNumber: number;
  snapshotProposal?: string;
  snapshotBlock?: number | null;
  initialTimestamp: BigNumber;
  finalTimestamp: BigNumber;
  initialBlock?: number | null;
  finalBlock?: number | null;
  totalEmission: BigNumber;
  protocolDistribution?: ProtocolDistribution | null;
}

export interface ProtocolDistribution {
  [protocol: string]: BigNumber; // the percentage of tokens distributed to users of Morpho-protocol in bps
}

export interface AgeConfig {
  ageName: string;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  distribution: DistributionFn;
  epochs: EpochConfig[];
}

export type DistributionFn = (
  age: AgeDistribution,
  epoch: EpochConfig,
  provider?: providers.Provider
) => Promise<{ marketsEmissions: { [p: string]: Optional<MarketEmission> } }>;
