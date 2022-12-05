import { BigNumber } from "ethers";
import { MarketEmission } from "./markets.types";
import { BASIS_POINTS, WAD } from "../../helpers";
import { MarketMinimal } from "../graph/getGraphMarkets/markets.types";
import { Optional } from "../../helpers/types";

export const computeMarketsEmissions = (
  ageOneMarketsParameters: {
    [p: string]: MarketMinimal;
  },
  totalEmission: BigNumber,
  duration: BigNumber
) => {
  const totalSupplyUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalSupply.mul(market.price))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const totalBorrowUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalBorrow.mul(market.price))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const total = totalBorrowUSD.add(totalSupplyUSD).div(WAD);

  const marketsEmissions: {
    [market: string]: Optional<MarketEmission>;
  } = {};
  let marketEmissionTotal = BigNumber.from(0);
  Object.keys(ageOneMarketsParameters).forEach((marketAddress) => {
    const market: MarketMinimal = ageOneMarketsParameters[marketAddress];
    // total market value at the beginning of the age
    const totalMarketUSD = market.totalBorrow.add(market.totalSupply).mul(market.price); // 18 * 2 units
    const marketEmission = totalMarketUSD.mul(totalEmission.div(WAD)).div(total); // in WEI units
    const supplyTokens = marketEmission.mul(market.p2pIndexCursor).div(BASIS_POINTS);
    const supplyRate = supplyTokens.div(duration);
    const borrowTokens = marketEmission.sub(supplyTokens);
    const borrowRate = borrowTokens.div(duration);
    marketEmissionTotal = marketEmissionTotal.add(marketEmission);
    marketsEmissions[marketAddress] = {
      supply: supplyTokens,
      supplyRate,
      borrow: borrowTokens,
      borrowRate,
      p2pIndexCursor: market.p2pIndexCursor,
      marketEmission,
    };
  });
  const liquidity = {
    totalSupply: totalSupplyUSD.div(WAD),
    totalBorrow: totalBorrowUSD.div(WAD),
    total,
  };
  return { liquidity, marketsEmissions };
};
