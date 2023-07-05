import { BigNumber, providers } from "ethers";

export interface DistributionParams {
  initialTimestamp: number;
  finalTimestamp: number;
  provider: providers.Provider;
  snapshotBlock: number;
  totalEmission: BigNumber;
}

export interface MarketEmission {
  morphoEmittedSupplySide: BigNumber;
  morphoRatePerSecondSupplySide: BigNumber;
  morphoEmittedBorrowSide: BigNumber;
  morphoRatePerSecondBorrowSide: BigNumber;
  totalMarketSizeBorrowSide: BigNumber;
  totalMarketSizeSupplySide: BigNumber;
  decimals: number;
}

export type DistributionFn = <T extends DistributionParams>(
  params: T
) => Promise<{ marketsEmissions: Record<string, MarketEmission> }>;
