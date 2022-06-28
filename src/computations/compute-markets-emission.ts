import { Market, MarketEmission } from "../types";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { BASE_UNITS } from "../helpers/maths";

export const computeMarketsEmission = (
  ageOneMarketsParameters: {
    [p: string]: Market;
  },
  totalEmission: BigNumber
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
    const totalMarketUSD = market.totalBorrow
      .add(market.totalSupply)
      .mul(market.price)
      .div(parseUnits("1"));
    const marketEmission = totalMarketUSD.mul(totalEmission).div(total);
    console.log(market.address, marketEmission.toString(), formatUnits(totalMarketUSD), totalEmission.toString(), formatUnits(total), totalMarketUSD.mul(10000).div(total).toString());
    marketsEmissions[marketAddress] = {
      supply: marketEmission.mul(market.p2pIndexCursor).div(BASE_UNITS),
      borrow: marketEmission
        .mul(BASE_UNITS.sub(market.p2pIndexCursor))
        .div(BASE_UNITS),
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
