import { BigNumber } from "ethers";
import { GraphUserBalances, UserBalances } from "./balances.types";

export const formatGraphBalances = (graphBalance: GraphUserBalances): UserBalances => ({
  address: graphBalance.address,
  id: graphBalance.id,
  balances: graphBalance.balances.map(({ market, ...balance }) => ({
    market: {
      address: market.address,
      supplyIndex: BigNumber.from(market.supplyIndex),
      poolSupplyIndex: BigNumber.from(market.poolSupplyIndex),
      p2pSupplyIndex: BigNumber.from(market.p2pSupplyIndex),
      supplyUpdateBlockTimestamp: BigNumber.from(market.supplyUpdateBlockTimestamp),
      supplyUpdateBlockTimestampV1: BigNumber.from(market.supplyUpdateBlockTimestampV1),

      borrowIndex: BigNumber.from(market.borrowIndex),
      poolBorrowIndex: BigNumber.from(market.poolBorrowIndex),
      p2pBorrowIndex: BigNumber.from(market.p2pBorrowIndex),
      borrowUpdateBlockTimestamp: BigNumber.from(market.borrowUpdateBlockTimestamp),
      borrowUpdateBlockTimestampV1: BigNumber.from(market.borrowUpdateBlockTimestampV1),

      lastPoolSupplyIndex: BigNumber.from(market.lastPoolSupplyIndex),
      lastP2PSupplyIndex: BigNumber.from(market.lastP2PSupplyIndex),
      lastPoolBorrowIndex: BigNumber.from(market.lastPoolBorrowIndex),
      lastP2PBorrowIndex: BigNumber.from(market.lastP2PBorrowIndex),
      lastTotalSupply: BigNumber.from(market.lastTotalSupply),
      lastTotalBorrow: BigNumber.from(market.lastTotalBorrow),

      scaledSupplyOnPool: BigNumber.from(market.scaledSupplyOnPool),
      scaledSupplyInP2P: BigNumber.from(market.scaledSupplyInP2P),
      scaledBorrowOnPool: BigNumber.from(market.scaledBorrowOnPool),
      scaledBorrowInP2P: BigNumber.from(market.scaledBorrowInP2P),
    },
    timestamp: BigNumber.from(balance.timestamp),
    userSupplyIndex: BigNumber.from(balance.userSupplyIndex),
    userBorrowIndex: BigNumber.from(balance.userBorrowIndex),
    underlyingSupplyBalance: BigNumber.from(balance.underlyingSupplyBalance),
    underlyingBorrowBalance: BigNumber.from(balance.underlyingBorrowBalance),

    scaledSupplyOnPool: BigNumber.from(balance.scaledSupplyOnPool),
    scaledSupplyInP2P: BigNumber.from(balance.scaledSupplyInP2P),
    scaledBorrowOnPool: BigNumber.from(balance.scaledBorrowOnPool),
    scaledBorrowInP2P: BigNumber.from(balance.scaledBorrowInP2P),

    userSupplyOnPoolIndex: BigNumber.from(balance.userSupplyOnPoolIndex),
    userSupplyInP2PIndex: BigNumber.from(balance.userSupplyInP2PIndex),
    userBorrowOnPoolIndex: BigNumber.from(balance.userBorrowOnPoolIndex),
    userBorrowInP2PIndex: BigNumber.from(balance.userBorrowInP2PIndex),
    accumulatedSupplyMorphoV1: BigNumber.from(balance.accumulatedSupplyMorphoV1),
    accumulatedBorrowMorphoV1: BigNumber.from(balance.accumulatedBorrowMorphoV1),

    accumulatedSupplyMorphoV2: BigNumber.from(balance.accumulatedSupplyMorphoV2),

    accumulatedBorrowMorphoV2: BigNumber.from(balance.accumulatedBorrowMorphoV2),

    accumulatedSupplyMorpho: BigNumber.from(balance.accumulatedSupplyMorpho),
    accumulatedBorrowMorpho: BigNumber.from(balance.accumulatedBorrowMorpho),
  })),
});
