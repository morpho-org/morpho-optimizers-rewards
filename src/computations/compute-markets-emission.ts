import { Market, MarketEmission } from "../types";
import { formatUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { BASE_UNITS } from "../helpers/maths";
import { WAD } from "../helpers/constants";

export const computeMarketsEmission = (
  ageOneMarketsParameters: {
    [p: string]: Market;
  },
  totalEmission: BigNumber,
  duration: BigNumber,
) => {
  const totalSupplyUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalSupply.mul(market.price))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const totalBorrowUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalBorrow.mul(market.price))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const total = totalBorrowUSD.add(totalSupplyUSD).div(WAD);

  const marketsEmissions: {
    [market: string]: MarketEmission | undefined;
  } = {};
  let marketEmissionTotal = BigNumber.from(0);
  Object.keys(ageOneMarketsParameters).forEach((marketAddress) => {
    const market: Market = ageOneMarketsParameters[marketAddress];
    // total market value at the beginning of the age
    const totalMarketUSD = market.totalBorrow.add(market.totalSupply).mul(market.price); // 18 * 2 units
    const marketEmission = totalMarketUSD.mul(totalEmission).div(total); // in WEI units
    const supplyTokens = marketEmission.mul(market.p2pIndexCursor).div(BASE_UNITS);
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
  console.log("total Emitted:", formatUnits(marketEmissionTotal));
  const liquidity = {
    totalSupply: totalSupplyUSD.div(WAD),
    totalBorrow: totalBorrowUSD.div(WAD),
    total,
  };
  return { liquidity, marketsEmissions };
};
