import { BigNumber } from "ethers";
import { Market } from "../getGraphMarkets/markets.types";

export interface GraphUserBalances {
  id: string;
  address: string;
  balances: {
    timestamp: string;
    userSupplyIndex: string;
    userBorrowIndex: string;
    underlyingSupplyBalance: string;
    underlyingBorrowBalance: string;

    scaledSupplyOnPool: string;
    scaledSupplyInP2P: string;
    scaledBorrowOnPool: string;
    scaledBorrowInP2P: string;

    userSupplyOnPoolIndex: string;
    userSupplyInP2PIndex: string;
    userBorrowOnPoolIndex: string;
    userBorrowInP2PIndex: string;
    accumulatedSupplyMorphoV1: string;
    accumulatedBorrowMorphoV1: string;

    accumulatedSupplyMorphoV2: string;

    accumulatedBorrowMorphoV2: string;

    accumulatedSupplyMorpho: string;
    accumulatedBorrowMorpho: string;
    market: {
      address: string;
      supplyIndex: string;
      poolSupplyIndex: string;
      p2pSupplyIndex: string;
      supplyUpdateBlockTimestamp: string;
      supplyUpdateBlockTimestampV1: string;

      borrowIndex: string;
      poolBorrowIndex: string;
      p2pBorrowIndex: string;
      borrowUpdateBlockTimestamp: string;
      borrowUpdateBlockTimestampV1: string;

      lastPoolSupplyIndex: string;
      lastP2PSupplyIndex: string;
      lastPoolBorrowIndex: string;
      lastP2PBorrowIndex: string;
      lastTotalSupply: string;
      lastTotalBorrow: string;

      scaledSupplyOnPool: string;
      scaledSupplyInP2P: string;
      scaledBorrowOnPool: string;
      scaledBorrowInP2P: string;
    };
  }[];
}
export interface UserBalances {
  address: string;
  id: string;
  balances: UserBalance[];
}
export interface UserBalance {
  userSupplyIndex: BigNumber;
  userBorrowIndex: BigNumber;
  underlyingSupplyBalance: BigNumber;
  underlyingBorrowBalance: BigNumber;

  scaledSupplyOnPool: BigNumber;
  scaledSupplyInP2P: BigNumber;
  scaledBorrowOnPool: BigNumber;
  scaledBorrowInP2P: BigNumber;

  userSupplyOnPoolIndex: BigNumber;
  userSupplyInP2PIndex: BigNumber;
  userBorrowOnPoolIndex: BigNumber;
  userBorrowInP2PIndex: BigNumber;
  accumulatedSupplyMorphoV1: BigNumber;
  accumulatedBorrowMorphoV1: BigNumber;

  accumulatedSupplyMorphoV2: BigNumber;

  accumulatedBorrowMorphoV2: BigNumber;

  accumulatedSupplyMorpho: BigNumber;
  accumulatedBorrowMorpho: BigNumber;
  timestamp: BigNumber;
  market: Market;
}
