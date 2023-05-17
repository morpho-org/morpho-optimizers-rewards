import { BigNumber, providers } from "ethers";
import MARKETS from "./markets";
import { MarketEmission } from "../../utils";
import fetchMarketsData from "../../utils/markets/fetchMarketsData";

export const computeDefaultMarketSidesRates = (
  address: string,
  morphoSupplyMarketSize: BigNumber,
  morphoBorrowMarketSize: BigNumber,
  emissionRatePerEpoch: BigNumber,
  duration: BigNumber
) => {
  const total = morphoSupplyMarketSize.add(morphoBorrowMarketSize);
  const morphoEmittedSupplySide = morphoSupplyMarketSize.mul(emissionRatePerEpoch).div(total);
  const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
  const morphoEmittedBorrowSide = morphoBorrowMarketSize.mul(emissionRatePerEpoch).div(total);
  const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);
  return {
    morphoEmittedSupplySide,
    morphoRatePerSecondSupplySide,
    morphoEmittedBorrowSide,
    morphoRatePerSecondBorrowSide,
  };
};

export const weightedDistribution = async (
  symbols: string[],
  getMarketEmissionRate: (symbol: string) => BigNumber,
  duration: BigNumber,
  snapshotBlock: providers.BlockTag,
  provider?: providers.Provider,
  computeMarketSidesRates = computeDefaultMarketSidesRates
) => {
  const { markets } = await fetchMarketsData(snapshotBlock, provider!);

  return Object.fromEntries(
    symbols.map((symbol) => {
      const address = MARKETS[symbol as keyof typeof MARKETS];

      if (!address) throw Error(`Cannot distribute MORPHO: unknown market ${symbol}`);
      const marketData = markets.find((market) => market.address.toLowerCase() === address.toLowerCase());
      if (!marketData) throw Error(`Cannot distribute MORPHO: no market data for ${symbol}`);

      const { morphoSupplyMarketSize, morphoBorrowMarketSize, p2pIndexCursor, decimals } = marketData;

      const emissionRatePerEpoch = getMarketEmissionRate(symbol);
      const {
        morphoEmittedSupplySide,
        morphoRatePerSecondSupplySide,
        morphoEmittedBorrowSide,
        morphoRatePerSecondBorrowSide,
      } = computeMarketSidesRates(
        address,
        morphoSupplyMarketSize,
        morphoBorrowMarketSize,
        emissionRatePerEpoch,
        duration
      );

      const marketEmission: MarketEmission = {
        morphoEmittedSupplySide,
        morphoRatePerSecondSupplySide,
        morphoEmittedBorrowSide,
        morphoRatePerSecondBorrowSide,
        marketEmission: emissionRatePerEpoch,
        totalMarketSizeBorrowSide: morphoBorrowMarketSize,
        totalMarketSizeSupplySide: morphoSupplyMarketSize,
        p2pIndexCursor,
        decimals,
      };

      return [address.toLowerCase(), marketEmission];
    })
  );
};
