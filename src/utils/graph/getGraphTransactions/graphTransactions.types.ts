export interface GraphTransactions {
  id: string;
  timestamp: string;
  hash: string;
  logIndex: string;
  market: { address: string };
  user: { address: string };
  type: TransactionType;
}
export type TransactionType = "Supply" | "Borrow" | "Withdraw" | "Repay";
