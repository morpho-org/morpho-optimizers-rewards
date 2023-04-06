import { BigNumber, providers } from "ethers";
import MARKETS from "./markets";
import { MarketEmission } from "../../utils";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export const weightedDistribution = async (
  symbols: string[],
  getMarketEmissionRate: (symbol: string) => BigNumber,
  duration: BigNumber,
  snapshotBlock: providers.BlockTag,
  provider?: providers.Provider
) => {
  const { markets } = await fetchMarketsData(snapshotBlock, provider!);

  return Object.fromEntries(
    symbols.map((symbol) => {
      const address = MARKETS[symbol as keyof typeof MARKETS];

      if (!address) throw Error(`Cannot distribute MORPHO: unknown market ${symbol}`);
      const marketData = markets.find((market) => market.address.toLowerCase() === address.toLowerCase());
      if (!marketData) throw Error(`Cannot distribute MORPHO: no market data for ${symbol}`);

      const { morphoSupplyMarketSize, morphoBorrowMarketSize, p2pIndexCursor } = marketData;

      const emissionRate = getMarketEmissionRate(symbol);
      const total = morphoSupplyMarketSize.add(morphoBorrowMarketSize);
      const morphoEmittedSupplySide = morphoSupplyMarketSize.mul(emissionRate).div(total);
      const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
      const morphoEmittedBorrowSide = morphoBorrowMarketSize.mul(emissionRate).div(total);
      const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);

      return [
        address.toLowerCase(),
        {
          morphoEmittedSupplySide,
          morphoRatePerSecondSupplySide,
          morphoEmittedBorrowSide,
          morphoRatePerSecondBorrowSide,
          marketEmission: emissionRate,
          totalMarketSizeBorrowSide: morphoBorrowMarketSize,
          totalMarketSizeSupplySide: morphoSupplyMarketSize,
          p2pIndexCursor,
        } as MarketEmission,
      ];
    })
  );
};
