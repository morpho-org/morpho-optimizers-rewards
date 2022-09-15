import { BigNumber } from "ethers";
import { getGraphMarkets } from "../../utils/graph/getGraphMarkets";
import { computeMarketsEmissions } from "../../utils/markets";
import { EpochConfig } from "../../ages";

export const ageOneDistribution = async (snapshotBlock: number, totalEmission: BigNumber, duration: BigNumber) => {
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(ageOneMarketsParameters, totalEmission, duration);
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};

export const epochToMarketsDistribution = async (epoch: EpochConfig) => {
  return ageOneDistribution(epoch.snapshotBlock, epoch.totalEmission, epoch.finalTimestamp.sub(epoch.initialTimestamp));
};
