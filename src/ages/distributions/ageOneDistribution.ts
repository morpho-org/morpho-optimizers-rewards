import { computeMarketsEmissions, getGraphMarkets } from "../../utils";
import { EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";

export const ageOneDistribution = async (
  age: AgeDistribution,
  { snapshotBlock, totalEmission, finalTimestamp, initialTimestamp, number }: EpochConfig
) => {
  if (!snapshotBlock) throw Error(`Cannot compute distribution for epoch ${number}: snapshotBlock is missing`);
  const duration = finalTimestamp.sub(initialTimestamp);
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(ageOneMarketsParameters, totalEmission, duration);
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};
