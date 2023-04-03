import { BigNumber, providers } from "ethers";
import MARKETS from "./markets";
import { MarketEmission } from "../../utils";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export const weightedDistribution = async (
  symbols: string[],
  getWeight: (symbol: string) => BigNumber,
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

      const distribution = getWeight(symbol);
      const total = morphoSupplyMarketSize.add(marketData.morphoBorrowMarketSize);
      const supply = morphoSupplyMarketSize.mul(distribution).div(total);
      const supplyRate = supply.div(duration);
      const borrow = morphoBorrowMarketSize.mul(distribution).div(total);
      const borrowRate = borrow.div(duration);
      const marketEmission = supply.add(borrow);
      return [
        address.toLowerCase(),
        {
          supply,
          supplyRate,
          borrow,
          borrowRate,
          marketEmission,
          morphoBorrow: morphoBorrowMarketSize,
          morphoSupply: morphoSupplyMarketSize,
          p2pIndexCursor,
        } as MarketEmission,
      ];
    })
  );
};
