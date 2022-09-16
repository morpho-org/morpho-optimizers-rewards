import { computeMarketsEmissions, getGraphMarkets } from "../../utils";
import { EpochConfig } from "../ages.types";

export const ageOneDistribution = async ({
  snapshotBlock,
  totalEmission,
  finalTimestamp,
  initialTimestamp,
  id,
}: EpochConfig) => {
  if (!snapshotBlock) throw Error(`Cannot compute distribution for epoch ${id}: snapshotBlock is missing`);
  const duration = finalTimestamp.sub(initialTimestamp);
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(ageOneMarketsParameters, totalEmission, duration);
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};
