import { DistributionParams } from "./common";
import { BigNumber, constants } from "ethers";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";
import { BASIS_POINTS } from "../../helpers";
import { MarketMinimal } from "../../utils/graph/getGraphMarkets/markets.types";

export interface morphoWeightedDistributionParams extends DistributionParams {
  protocolDistribution: {
    morphoCompound: number;
    morphoAaveV2: number;
  };
}
const validateParams = (p: any) => {
  if (!("morphoCompound" in p)) throw Error("Missing field morphoCompound in protocolDistribution");
  if (!("morphoAaveV2" in p)) throw Error("Missing field morphoAaveV2 in protocolDistribution");
  if (p.morphoCompound + p.morphoAaveV2 !== 100_00) throw Error("Protocols distributions dont sum to 1");
};

const morphoWeightedDistribution = async ({
  protocolDistribution,
  totalEmission,
  finalTimestamp,
  initialTimestamp,
  snapshotBlock,
  provider,
  id,
}: morphoWeightedDistributionParams) => {
  if (!protocolDistribution) throw Error(`Cannot distribute tokens for ${id}: no protocolDistribution`);
  validateParams(protocolDistribution);

  const { aave, compound } = await fetchMarketsData(snapshotBlock, provider);

  const aaveTokens = totalEmission.mul(protocolDistribution.morphoAaveV2).div(BASIS_POINTS);

  const compoundTokens = totalEmission.sub(aaveTokens);

  const duration = BigNumber.from(finalTimestamp - initialTimestamp);

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

export default morphoWeightedDistribution;
