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
      decimals: number;
      address: string;
      supplyIndex: string;
      borrowIndex: string;
      supplyUpdateBlockTimestamp: string;
      borrowUpdateBlockTimestamp: string;
      totalSupplyOnPool: string;
      totalSupplyP2P: string;
      totalBorrowOnPool: string;
      totalBorrowP2P: string;
      lastP2PBorrowIndex: string;
      lastPoolBorrowIndex: string;
      lastP2PSupplyIndex: string;
      lastPoolSupplyIndex: string;
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
  unclaimedMorpho: BigNumber;
  market: Market;
}
export interface Market {
  address: string;
  decimals: number;
  supplyIndex: BigNumber;
  borrowIndex: BigNumber;
  supplyUpdateBlockTimestamp: BigNumber;
  borrowUpdateBlockTimestamp: BigNumber;
  totalSupplyOnPool: BigNumber;
  totalSupplyP2P: BigNumber;
  totalBorrowOnPool: BigNumber;
  totalBorrowP2P: BigNumber;
  lastP2PBorrowIndex: BigNumber;
  lastPoolBorrowIndex: BigNumber;
  lastP2PSupplyIndex: BigNumber;
  lastPoolSupplyIndex: BigNumber;
}
