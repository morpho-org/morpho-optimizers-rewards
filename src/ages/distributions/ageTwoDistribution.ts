import { BigNumber, constants, providers } from "ethers";
import { Optional } from "../../helpers/types";
import { MarketMinimal } from "../../utils/graph/getGraphMarkets/markets.types";
import { BASIS_POINTS } from "../../helpers";
import { MarketEmission } from "../../utils";
import { EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export const ageTwoDistribution = async (
  epoch: AgeDistribution,
  { protocolDistribution, totalEmission, finalTimestamp, initialTimestamp, snapshotBlock, number }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for ${number}: no snapshotBlock`);
  provider ??= new providers.InfuraProvider("mainnet");
  if (!protocolDistribution) throw Error(`Cannot distribute tokens for ${number}: no protocolDistribution`);

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
  const marketsEmissions: {
    [market: string]: Optional<MarketEmission>;
  } = {};

  marketsData.forEach(
    ({
      morphoBorrowMarketSize,
      morphoSupplyMarketSize,
      p2pIndexCursor,
      totalPoolBorrowUSD,
      totalPoolSupplyUSD,
      address,
    }) => {
      const supply = totalPoolSupplyUSD.mul(distribution).div(total);
      const supplyRate = supply.div(duration);
      const borrow = totalPoolBorrowUSD.mul(distribution).div(total);
      const borrowRate = borrow.div(duration);
      const marketEmission = supply.add(borrow);

      marketsEmissions[address.toLowerCase()] = {
        supply,
        supplyRate,
        borrow,
        borrowRate,
        marketEmission,
        morphoBorrow: morphoBorrowMarketSize,
        morphoSupply: morphoSupplyMarketSize,
        p2pIndexCursor,
      };
    }
  );

  return marketsEmissions;
};
