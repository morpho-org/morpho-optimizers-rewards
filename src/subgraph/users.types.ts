import { TransactionType } from "../types";

export interface GraphUser {
  address: string;
  balances: GraphBalance[];
}

export interface GraphBalance {
  market: { address: string };
  timestamp: string;
  blockNumber: number;
  underlyingSupplyBalance: string;
  underlyingBorrowBalance: string;
}

export interface GraphUserTxs extends GraphBalance {
  type: TransactionType;
  user: { address: string };
  id: string;
}
