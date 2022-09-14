import configuration from "./configuration";
import { BigNumber } from "ethers";
import { getGraphMarkets } from "../../utils/graph/getGraphMarkets";
import { computeMarketsEmissions } from "../../utils/markets";

export const ageOneDistribution = async (snapshotBlock: number, totalEmission: BigNumber, duration: BigNumber) => {
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(ageOneMarketsParameters, totalEmission, duration);
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};

export const epochToMarketsDistribution = async (
  epoch: typeof configuration.epochs[keyof typeof configuration.epochs],
) => {
  return ageOneDistribution(epoch.snapshotBlock, epoch.totalEmission, epoch.finalTimestamp.sub(epoch.initialTimestamp));
};
