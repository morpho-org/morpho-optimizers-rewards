import { TransactionType } from "../types";

export interface GraphUser {
  address: string;
  balances: GraphBalance[];
}

export interface GraphBalance {
  id: string;
  timestamp: string;
  blockNumber: string;
  market: { address: string; supplyIndex: string}
  underlyingSupplyBalance: string;
  underlyingBorrowBalance: string;
  userSupplyIndex: string;
  unclaimedMorpho: string;
}

export interface GraphUserTxs extends GraphBalance {
  type: TransactionType;
  user: { address: string };
  id: string;
}
