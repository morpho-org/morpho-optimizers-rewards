import { DistributionFn, EpochConfig } from "../../ages.types";
import { AgeDistribution } from "../distributions.types";
import { providers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import marketsRepartition from "./marketsRepartition";
import { weightedDistribution } from "../weightedDistribution";
import { PercentMath } from "@morpho-labs/ethers-utils/lib/maths";
import { blockFromTimestamp } from "../../../utils";

export const ageFourDistribution: DistributionFn = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, snapshotBlock, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) {
    console.log("No snapshot block for age4 distribution. Fetching from Etherscan.");
    snapshotBlock = +(await blockFromTimestamp(initialTimestamp.sub(3600), "after"));
  }

  const duration = finalTimestamp.sub(initialTimestamp);

  const getMarketEmissionRate = (symbol: string) =>
    PercentMath.percentMul(
      totalEmission,
      parseUnits((marketsRepartition[symbol as keyof typeof marketsRepartition].weight / 100).toString(), 4)
    );

  const marketsEmissions = await weightedDistribution(
    Object.keys(marketsRepartition),
    getMarketEmissionRate,
    duration,
    snapshotBlock,
    provider
  );

  return { marketsEmissions };
};
