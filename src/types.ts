import { BigNumber } from "ethers";
export type NormalizedObject<T> = { [key: string]: T | undefined };
export type MultiplicatorPerMarkets = NormalizedObject<{
  supply: BigNumber;
  borrow: BigNumber;
}>;
export type UserMultiplicators = NormalizedObject<MultiplicatorPerMarkets>;

export interface Balance {
  timestamp: BigNumber;
  blockNumber: number;
  market: string;
  underlyingSupplyBalance: BigNumber;
  underlyingBorrowBalance: BigNumber;
}
export interface Market {
  address: string;
  price: BigNumber;
  totalSupply: BigNumber;
  totalBorrow: BigNumber;
  p2pIndexCursor: BigNumber;
}

export interface MarketEmission {
  supply: BigNumber;
  supplyRate: BigNumber;
  borrow: BigNumber;
  borrowRate: BigNumber;
  p2pIndexCursor: BigNumber;
}

export interface UsersDistribution {
  [user: string]: string;
}
