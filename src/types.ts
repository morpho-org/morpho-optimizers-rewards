import { BigNumber } from "ethers";

export interface MultiplicatorPerMarkets {
  [markets: string]: { supply: BigNumber; borrow: BigNumber };
}
export interface UserMultiplicators {
  [user: string]: MultiplicatorPerMarkets | undefined;
}

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
