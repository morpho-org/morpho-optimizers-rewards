import { BigNumber, constants, providers } from "ethers";
import { MarketMinimal } from "../../utils/graph/getGraphMarkets/markets.types";
import { BASIS_POINTS } from "../../helpers";
import { DistributionFn, EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export const ageTwoDistribution: DistributionFn = async (
  epoch: AgeDistribution,
  { protocolDistribution, totalEmission, finalTimestamp, initialTimestamp, snapshotBlock, epochNumber }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for ${epochNumber}: no snapshotBlock`);
  provider ??= new providers.InfuraProvider("mainnet");
  if (!protocolDistribution) throw Error(`Cannot distribute tokens for ${epochNumber}: no protocolDistribution`);

  const { aave, compound } = await fetchMarketsData(snapshotBlock, provider);

  const aaveTokens = totalEmission.mul(protocolDistribution.morphoAave).div(BASIS_POINTS);

  const compoundTokens = totalEmission.sub(aaveTokens);

  const duration = finalTimestamp.sub(initialTimestamp);

  const aaveDistribution = distributeTokens(aave, aaveTokens, duration);

  const compoundDistribution = distributeTokens(compound, compoundTokens, duration);

  return {
    marketsEmissions: { ...aaveDistribution, ...compoundDistribution },
    marketsParameters: [...aave, ...compound],
  };
};

const distributeTokens = (marketsData: MarketMinimal[], distribution: BigNumber, duration: BigNumber) => {
  const totalPoolSupplyUSD = marketsData.reduce((acc, market) => acc.add(market.totalPoolSupplyUSD), constants.Zero);
  const totalBorrow = marketsData.reduce((acc, market) => acc.add(market.totalPoolBorrowUSD), constants.Zero);

  const total = totalBorrow.add(totalPoolSupplyUSD);

  return Object.fromEntries(
    marketsData.map(
      ({
        morphoBorrowMarketSize,
        morphoSupplyMarketSize,
        p2pIndexCursor,
        totalPoolBorrowUSD,
        totalPoolSupplyUSD,
        address,
        decimals,
      }) => {
        const morphoEmittedSupplySide = totalPoolSupplyUSD.mul(distribution).div(total);
        const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
        const morphoEmittedBorrowSide = totalPoolBorrowUSD.mul(distribution).div(total);
        const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);
        const marketEmission = morphoEmittedSupplySide.add(morphoEmittedBorrowSide);

        return [
          address.toLowerCase(),
          {
            morphoEmittedSupplySide,
            morphoRatePerSecondSupplySide,
            morphoEmittedBorrowSide,
            morphoRatePerSecondBorrowSide,
            marketEmission,
            totalMarketSizeBorrowSide: morphoBorrowMarketSize,
            totalMarketSizeSupplySide: morphoSupplyMarketSize,
            p2pIndexCursor,
            decimals,
          },
        ];
      }
    )
  );
};
