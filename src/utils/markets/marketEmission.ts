import { BigNumber, constants } from "ethers";
import { BASIS_POINTS, WAD } from "../../helpers";
import { MarketMinimal } from "../graph/getGraphMarkets/markets.types";

export const computeMarketsEmissions = (
  ageOneMarketsParameters: {
    [p: string]: MarketMinimal;
  },
  totalEmission: BigNumber,
  duration: BigNumber
) => {
  const totalSupplyUSD = Object.values(ageOneMarketsParameters)
    .map(({ totalPoolSupplyUSD, price }) => totalPoolSupplyUSD.mul(price))
    .reduce((a, b) => a.add(b), constants.Zero);

  const totalBorrowUSD = Object.values(ageOneMarketsParameters)
    .map(({ totalPoolBorrowUSD, price }) => totalPoolBorrowUSD.mul(price))
    .reduce((a, b) => a.add(b), constants.Zero);

  const total = totalBorrowUSD.add(totalSupplyUSD).div(WAD);

  const marketsEmissions = Object.values(ageOneMarketsParameters).map(
    ({
      decimals,
      p2pIndexCursor,
      totalPoolBorrowUSD,
      totalPoolSupplyUSD,
      morphoSupplyMarketSize,
      morphoBorrowMarketSize,
      price,
      address,
    }) => {
      // total market value at the beginning of the age
      const totalMarketUSD = totalPoolBorrowUSD.add(totalPoolSupplyUSD).mul(price); // 18 * 2 units
      const marketEmission = totalMarketUSD.mul(totalEmission.div(WAD)).div(total); // in WEI units
      const morphoEmittedSupplySide = marketEmission.mul(p2pIndexCursor).div(BASIS_POINTS);
      const morphoRatePerSecondSupplySide = morphoEmittedSupplySide.div(duration);
      const morphoEmittedBorrowSide = marketEmission.sub(morphoEmittedSupplySide);
      const morphoRatePerSecondBorrowSide = morphoEmittedBorrowSide.div(duration);

      return [
        address.toLowerCase(),
        {
          morphoEmittedSupplySide,
          morphoRatePerSecondSupplySide,
          morphoEmittedBorrowSide,
          morphoRatePerSecondBorrowSide,
          p2pIndexCursor,
          marketEmission,
          totalMarketSizeBorrowSide: morphoBorrowMarketSize,
          totalMarketSizeSupplySide: morphoSupplyMarketSize,
          decimals,
        },
      ];
    }
  );
  const liquidity = {
    totalPoolSupplyUSD: totalSupplyUSD.div(WAD),
    totalBorrow: totalBorrowUSD.div(WAD),
    total,
  };
  return { liquidity, marketsEmissions };
};
