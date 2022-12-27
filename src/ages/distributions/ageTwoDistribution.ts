import { BigNumber, providers } from "ethers";
import { Optional } from "../../helpers/types";
import { MarketMinimal } from "../../utils/graph/getGraphMarkets/markets.types";
import { BASIS_POINTS } from "../../helpers";
import { MarketEmission } from "../../utils";
import { EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import getMarketsData from "../../utils/markets/getMarketsData";

export const ageTwoDistribution = async (
  epoch: AgeDistribution,
  epochConfig: EpochConfig,
  provider?: providers.Provider
) => {
  if (!epochConfig.snapshotBlock) throw Error(`Cannot distribute tokens for ${epochConfig.id}: no snapshotBlock`);
  provider ??= new providers.InfuraProvider("mainnet");
  if (!epochConfig.protocolDistribution)
    throw Error(`Cannot distribute tokens for ${epochConfig.id}: no protocolDistribution`);
  const { aave, compound } = await getMarketsData(epochConfig.snapshotBlock, provider);
  const aaveTokens = epochConfig.totalEmission.mul(epochConfig.protocolDistribution.morphoAave).div(BASIS_POINTS);
  const compoundTokens = epochConfig.totalEmission.sub(aaveTokens);
  const duration = epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp);
  const aaveDistribution = distributeTokens(aave, aaveTokens, duration);
  const compoundDistribution = distributeTokens(compound, compoundTokens, duration);
  return {
    marketsEmissions: { ...aaveDistribution, ...compoundDistribution },
    marketsParameters: [...aave, ...compound],
  };
};

const distributeTokens = (marketsData: MarketMinimal[], distribution: BigNumber, duration: BigNumber) => {
  const totalSupply = marketsData.reduce((acc, market) => acc.add(market.totalSupply), BigNumber.from(0));
  const totalBorrow = marketsData.reduce((acc, market) => acc.add(market.totalBorrow), BigNumber.from(0));
  const total = totalBorrow.add(totalSupply);
  const marketsEmissions: {
    [market: string]: Optional<MarketEmission>;
  } = {};
  marketsData.forEach((marketData) => {
    const supply = marketData.totalSupply.mul(distribution).div(total);
    const supplyRate = supply.div(duration);
    const borrow = marketData.totalBorrow.mul(distribution).div(total);
    const borrowRate = borrow.div(duration);
    const marketEmission = supply.add(borrow);
    marketsEmissions[marketData.address.toLowerCase()] = {
      supply,
      supplyRate,
      borrow,
      borrowRate,
      marketEmission,
      morphoBorrow: marketData.totalMorphoBorrow,
      morphoSupply: marketData.totalMorphoSupply,
      p2pIndexCursor: marketData.p2pIndexCursor,
    };
  });
  return marketsEmissions;
};
