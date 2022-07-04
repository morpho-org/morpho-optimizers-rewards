import { Market, MarketEmission } from "../types";
import { parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { BASE_UNITS } from "../helpers/maths";
import { WEI } from "../helpers/constants";

export const computeMarketsEmission = (
  ageOneMarketsParameters: {
    [p: string]: Market;
  },
  totalEmission: BigNumber,
  duration: BigNumber,
) => {
  const totalSupplyUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalSupply.mul(market.price).div(parseUnits("1")))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const totalBorrowUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalBorrow.mul(market.price).div(parseUnits("1")))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const total = totalBorrowUSD.add(totalSupplyUSD);

  const marketsEmissions: {
    [market: string]: MarketEmission | undefined;
  } = {};
  Object.keys(ageOneMarketsParameters).forEach((marketAddress) => {
    const market: Market = ageOneMarketsParameters[marketAddress];
    // total market value at the beginning of the age
    const totalMarketUSD = market.totalBorrow.add(market.totalSupply).mul(market.price).div(parseUnits("1"));
    const marketEmission = totalMarketUSD.mul(totalEmission).mul(WEI).div(total); // in WEI units
    const supplyTokens = marketEmission.mul(market.p2pIndexCursor).div(BASE_UNITS);
    const supplyRate = supplyTokens.div(duration);
    const borrowTokens = marketEmission.sub(supplyTokens);
    const borrowRate = borrowTokens.div(duration);
    marketsEmissions[marketAddress] = {
      supply: supplyTokens,
      supplyRate,
      borrow: borrowTokens,
      borrowRate,
      p2pIndexCursor: market.p2pIndexCursor,
    };
  });
  const liquidity = {
    totalSupply: totalSupplyUSD,
    totalBorrow: totalBorrowUSD,
    total,
  };
  return { liquidity, marketsEmissions };
};
