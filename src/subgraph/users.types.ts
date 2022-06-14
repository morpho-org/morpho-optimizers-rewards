import { TransactionType } from "../types";

export interface GraphUser {
  address: string;
  balances: {
    type: TransactionType;
    timestamp: number;
    underlyingSupplyBalance: string;
    underlyingBorrowBalance: string;
    blockNumber: number;
    market: string;
  }[];
}
