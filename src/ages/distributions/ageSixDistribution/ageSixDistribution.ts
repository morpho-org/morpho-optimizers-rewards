/**
 * Specs are defined in the following forum post:
 * https://forum.morpho.xyz/t/mip-morpho-rewards-age-5/303
 */
import { DistributionFn, EpochConfig } from "../../ages.types";
import { AgeDistribution } from "../distributions.types";
import { BigNumber, constants, providers } from "ethers";
import marketsRepartition from "./marketsRepartition";
import { computeDefaultMarketSidesRates, weightedDistribution } from "../weightedDistribution";
import { PercentMath } from "@morpho-labs/ethers-utils/lib/maths";
import { blockFromTimestamp } from "../../../utils";

export const ageSixDistribution: DistributionFn = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, snapshotBlock, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) {
    console.log("No snapshot block for age5 distribution. Fetching from Etherscan.");
    snapshotBlock = +(await blockFromTimestamp(initialTimestamp.sub(3600), "after"));
  }

  const duration = finalTimestamp.sub(initialTimestamp);

  const getMarketEmissionRate = (symbol: string) =>
    PercentMath.percentMul(
      totalEmission,
      marketsRepartition[symbol as keyof typeof marketsRepartition]?.weight ?? constants.Zero
    );
  const computeMarketSidesRates = (
    address: string,
    morphoSupplyMarketSize: BigNumber,
    morphoBorrowMarketSize: BigNumber,
    emissionRatePerEpoch: BigNumber,
    duration: BigNumber
  ) => {
    if (address.toLowerCase() === marketsRepartition.aWETHV3.market.toLowerCase())
      // Morpho Aave v3 has rewards only on the supply side
      return {
        morphoEmittedSupplySide: emissionRatePerEpoch,
        morphoRatePerSecondSupplySide: emissionRatePerEpoch.div(duration),
        morphoEmittedBorrowSide: constants.Zero,
        morphoRatePerSecondBorrowSide: constants.Zero,
      };
    return computeDefaultMarketSidesRates(
      address,
      morphoSupplyMarketSize,
      morphoBorrowMarketSize,
      emissionRatePerEpoch,
      duration
    );
  };

  const marketsEmissions = await weightedDistribution(
    Object.keys(marketsRepartition),
    getMarketEmissionRate,
    duration,
    snapshotBlock,
    provider,
    computeMarketSidesRates
  );

  return { marketsEmissions };
};
