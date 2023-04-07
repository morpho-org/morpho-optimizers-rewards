import { blockFromTimestamp, computeMarketsEmissions, getGraphMarkets } from "../../utils";
import { DistributionFn, EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";

export const ageOneDistribution: DistributionFn = async (
  age: AgeDistribution,
  { snapshotBlock, totalEmission, finalTimestamp, initialTimestamp }: EpochConfig
) => {
  if (!snapshotBlock) snapshotBlock = +(await blockFromTimestamp(initialTimestamp.sub(3600), "after"));
  const duration = finalTimestamp.sub(initialTimestamp);
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(ageOneMarketsParameters, totalEmission, duration);
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};
