import { BigNumber } from "ethers";
import { GraphUserBalances, UserBalances } from "./balances.types";

export const formatGraphBalances = (graphBalance: GraphUserBalances): UserBalances => ({
  address: graphBalance.address,
  id: graphBalance.id,
  balances: graphBalance.balances.map(({ market, ...balance }) => ({
    market: {
      address: market.address,
      supplyIndex: BigNumber.from(market.supplyIndex),
      lastP2PSupplyIndex: BigNumber.from(market.lastP2PSupplyIndex),
      lastP2PBorrowIndex: BigNumber.from(market.lastP2PBorrowIndex),
      borrowIndex: BigNumber.from(market.borrowIndex),
      lastPoolBorrowIndex: BigNumber.from(market.lastPoolBorrowIndex),
      lastPoolSupplyIndex: BigNumber.from(market.lastPoolSupplyIndex),
      borrowUpdateBlockTimestamp: BigNumber.from(market.borrowUpdateBlockTimestamp),
      supplyUpdateBlockTimestamp: BigNumber.from(market.supplyUpdateBlockTimestamp),
      lastTotalBorrow: BigNumber.from(market.lastTotalBorrow),
      lastTotalSupply: BigNumber.from(market.lastTotalSupply),
    },
    timestamp: BigNumber.from(balance.timestamp),
    accumulatedMorpho: BigNumber.from(balance.unclaimedMorpho),
    underlyingBorrowBalance: BigNumber.from(balance.underlyingBorrowBalance),
    underlyingSupplyBalance: BigNumber.from(balance.underlyingSupplyBalance),
    userBorrowIndex: BigNumber.from(balance.userBorrowIndex),
    userSupplyIndex: BigNumber.from(balance.userSupplyIndex),
  })),
});
