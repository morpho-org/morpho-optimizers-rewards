import { DistributionParams } from "./common";
import { computeMarketsEmissions, getGraphMarkets } from "../../utils";
import { BigNumber } from "ethers";

export interface PoolWeightedDistributionParams extends DistributionParams {
  protocolDistribution: {
    morphoCompound: number;
    morphoAaveV2?: number;
  };
}

const poolWeightedDistribution = async ({
  initialTimestamp,
  finalTimestamp,
  snapshotBlock,
  totalEmission,
}: PoolWeightedDistributionParams) => {
  const duration = finalTimestamp - initialTimestamp;
  const ageOneMarketsParameters = await getGraphMarkets(snapshotBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmissions(
    ageOneMarketsParameters,
    totalEmission,
    BigNumber.from(duration)
  );
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};

export default poolWeightedDistribution;
