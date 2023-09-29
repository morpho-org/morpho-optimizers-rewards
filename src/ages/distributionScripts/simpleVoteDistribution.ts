import { BigNumber } from "ethers";
import { PercentMath } from "@morpho-labs/ethers-utils/lib/maths";
import { DistributionParams } from "./common";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export interface SimpleVoteParams extends DistributionParams {
  marketsRepartition: MarketWeight[];
}

interface MarketWeight {
  symbol: string;
  market: string;
  weight: number;
  sideDistribution?: {
    type: string;
    params: {
      supplySide: number;
      borrowSide: number;
    };
  };
}

const simpleVoteDistribution = async ({
  finalTimestamp,
  initialTimestamp,
  snapshotBlock,
  totalEmission,
  provider,
  marketsRepartition,
}: SimpleVoteParams) => {
  const duration = BigNumber.from(finalTimestamp - initialTimestamp);

  const sumMarkets = marketsRepartition.reduce((acc, { weight }) => acc + weight, 0);
  if (sumMarkets !== 10_000) throw Error("Weights are not summing to 1");

  // Make sure that all markets are unique
  const uniqMarkets = [...new Set(marketsRepartition.map((m) => m.market.toLowerCase()))];

  if (uniqMarkets.length !== marketsRepartition.length) throw Error("Duplicated market");

  const { markets } = await fetchMarketsData(snapshotBlock, provider);

  const marketsEmissions = Object.fromEntries(
    marketsRepartition.map(({ market, weight, sideDistribution }) => {
      const marketData = markets.find((m) => m.address.toLowerCase() === market.toLowerCase());
      if (!marketData) throw Error(`Unknown market ${market}`);
      const emissionRatePerEpoch = PercentMath.percentMul(totalEmission, weight);
      const { morphoSupplyMarketSize, morphoBorrowMarketSize, decimals } = marketData;

      const total = morphoSupplyMarketSize.add(morphoBorrowMarketSize);
      const baseMarket = {
        totalMarketSizeBorrowSide: morphoBorrowMarketSize,
        totalMarketSizeSupplySide: morphoSupplyMarketSize,
        decimals,
      };

      if (sideDistribution) {
        if (sideDistribution.type !== "static") throw Error("Only static size distribution is supported for now");
        const { supplySide, borrowSide } = sideDistribution.params;
        if (supplySide === undefined || borrowSide === undefined)
          throw Error("Missing supply or borrow size distribution params");
        const morphoEmittedSupplySide = PercentMath.percentMul(emissionRatePerEpoch, supplySide);
        const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
        const morphoEmittedBorrowSide = PercentMath.percentMul(emissionRatePerEpoch, borrowSide);
        const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);
        return [
          market.toLowerCase(),
          {
            ...baseMarket,
            morphoEmittedSupplySide,
            morphoRatePerSecondSupplySide,
            morphoEmittedBorrowSide,
            morphoRatePerSecondBorrowSide,
          },
        ];
      }
      const morphoEmittedSupplySide = morphoSupplyMarketSize.mul(emissionRatePerEpoch).div(total);
      const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
      const morphoEmittedBorrowSide = morphoBorrowMarketSize.mul(emissionRatePerEpoch).div(total);
      const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);

      return [
        market.toLowerCase(),
        {
          ...baseMarket,
          morphoEmittedSupplySide,
          morphoRatePerSecondSupplySide,
          morphoEmittedBorrowSide,
          morphoRatePerSecondBorrowSide,
        },
      ];
    })
  );

  return { marketsEmissions };
};

export default simpleVoteDistribution;
