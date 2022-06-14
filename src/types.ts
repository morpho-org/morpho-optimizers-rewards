import { BigNumber } from "ethers";
export type NormalizedObject<T> = { [key: string]: T | undefined };
export type MultiplicatorPerMarkets = NormalizedObject<{
  supply: BigNumber;
  borrow: BigNumber;
}>;
export type UserMultiplicators = NormalizedObject<MultiplicatorPerMarkets>;
export interface User {
  address: string;
  balances: Balance[];
}

export interface Balance {
  timestamp: BigNumber;
  blockNumber: number;
  market: string;
  type: TransactionType;
  underlyingSupplyBalance: BigNumber;
  underlyingBorrowBalance: BigNumber;
}

export enum TransactionType {
  Supply = "Supply",
  Borrow = "Borrow",
  Withdraw = "Withdraw",
  Repay = "Repay",
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
  borrow: BigNumber;
  p2pIndexCursor: BigNumber;
}
