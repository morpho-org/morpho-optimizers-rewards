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
}
export interface Epoch2Config extends EpochConfig {
  compoundRepartition: BigNumber; // the percentage of tokens emitted on Compound in Base units
  aaveRepartition: BigNumber; // the percentage of tokens emitted on Aave in Base units
}

export interface AgeConfig<T> {
  ageName: string;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  distribution: (
    epoch: T,
    provider?: providers.Provider
  ) => Promise<{ marketsEmissions: { [p: string]: Optional<MarketEmission> } }>;
  subgraphUrl: string;
  epochs: T[];
}
