import { GraphUserBalances, UserBalances } from "./types";
import { BigNumber } from "ethers";

export const formatGraphBalances = (graphBalance: GraphUserBalances): UserBalances => ({
  address: graphBalance.address,
  balances: graphBalance.balances.map(({ market, ...balance }) => ({
    market: {
      address: market.address,
      decimals: market.decimals,
      supplyIndex: BigNumber.from(market.supplyIndex),
      lastP2PSupplyIndex: BigNumber.from(market.lastP2PSupplyIndex),
      lastP2PBorrowIndex: BigNumber.from(market.lastP2PBorrowIndex),
      borrowIndex: BigNumber.from(market.borrowIndex),
      lastPoolBorrowIndex: BigNumber.from(market.lastPoolBorrowIndex),
      lastPoolSupplyIndex: BigNumber.from(market.lastPoolSupplyIndex),
      totalBorrowOnPool: BigNumber.from(market.totalBorrowOnPool),
      totalSupplyOnPool: BigNumber.from(market.totalSupplyOnPool),
      totalBorrowP2P: BigNumber.from(market.totalBorrowP2P),
      totalSupplyP2P: BigNumber.from(market.totalSupplyP2P),
      borrowUpdateBlockTimestamp: BigNumber.from(market.borrowUpdateBlockTimestamp),
      supplyUpdateBlockTimestamp: BigNumber.from(market.supplyUpdateBlockTimestamp),
    },
    timestamp: BigNumber.from(balance.timestamp),
    unclaimedMorpho: BigNumber.from(balance.unclaimedMorpho),
    underlyingBorrowBalance: BigNumber.from(balance.underlyingBorrowBalance),
    underlyingSupplyBalance: BigNumber.from(balance.underlyingSupplyBalance),
    userBorrowIndex: BigNumber.from(balance.userBorrowIndex),
    userSupplyIndex: BigNumber.from(balance.userSupplyIndex),
  })),
});
