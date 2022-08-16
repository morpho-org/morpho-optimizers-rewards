import { BigNumber } from "ethers";

export interface GraphUserBalances {
  address: string;
  balances: {
    timestamp: string;
    underlyingSupplyBalance: string;
    underlyingBorrowBalance: string;
    userSupplyIndex: string;
    userBorrowIndex: string;
    unclaimedMorpho: string;
    market: {
      address: string;
      supplyIndex: string;
      borrowIndex: string;
      supplyUpdateBlockTimestamp: string;
      borrowUpdateBlockTimestamp: string;
      lastP2PBorrowIndex: string;
      lastPoolBorrowIndex: string;
      lastP2PSupplyIndex: string;
      lastPoolSupplyIndex: string;
      lastTotalBorrow: string;
      lastTotalSupply: string;
    };
  }[];
}
export interface UserBalances {
  address: string;
  balances: UserBalance[];
}
export interface UserBalance {
  timestamp: BigNumber;
  underlyingSupplyBalance: BigNumber;
  underlyingBorrowBalance: BigNumber;
  userSupplyIndex: BigNumber;
  userBorrowIndex: BigNumber;
  accumulatedMorpho: BigNumber;
  market: Market;
}
export interface Market {
  address: string;
  supplyIndex: BigNumber;
  borrowIndex: BigNumber;
  supplyUpdateBlockTimestamp: BigNumber;
  borrowUpdateBlockTimestamp: BigNumber;
  lastP2PBorrowIndex: BigNumber;
  lastPoolBorrowIndex: BigNumber;
  lastP2PSupplyIndex: BigNumber;
  lastPoolSupplyIndex: BigNumber;
  lastTotalBorrow: BigNumber;
  lastTotalSupply: BigNumber;
}
