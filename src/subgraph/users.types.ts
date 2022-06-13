import { BigNumber } from "ethers";

export interface GraphUser {
  address: string;
  transactions: {
    type: Type;
    eventTimestamp: number;
    amount: string;
    eventBlock: number;
    market: { address: string };
  }[];
}

export interface User {
  address: string;
  balances: Balance[];
}

export interface Balance {
  timestamp: BigNumber;
  blockNumber: number;
  market: string;
  type: Type;
  underlyingSupplyBalance: BigNumber;
  underlyingBorrowBalance: BigNumber;
}

export enum Type {
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
