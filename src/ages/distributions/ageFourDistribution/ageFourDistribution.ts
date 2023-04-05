import { EpochConfig } from "../../ages.types";
import { AgeDistribution } from "../distributions.types";
import { providers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import marketsRepartition from "./marketsRepartition";
import { weightedDistribution } from "../weightedDistribution";
import { PercentMath } from "@morpho-labs/ethers-utils/lib/maths";

export const ageFourDistribution = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, number, snapshotBlock, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${number}: no snapshotBlock`);

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
