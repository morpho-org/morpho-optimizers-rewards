import { BigNumber, BigNumberish } from "ethers";
import { TransactionType } from "./types";
import axios from "axios";

export const getGraphTransactions = async (
  graphUrl: string,
  timestampFrom: BigNumberish,
  timestampTo: BigNumberish,
) => {
  const variables = {
    timestampFrom: BigNumber.from(timestampFrom).toString(),
    timestampTo: BigNumber.from(timestampTo).toString(),
  };
  let txs: GraphTransactions[] = [];
  let hasMore = true;
  let nextId = "";
  while (hasMore) {
    const newTxs = await axios
      .post(graphUrl, {
        query,
        variables: {
          ...variables,
          nextId,
        },
      })
      .then((r) => r.data.data.transactions as GraphTransactions[]);
    txs = [...txs, ...newTxs];
    hasMore = newTxs.length === 1000;
    nextId = newTxs.length > 0 ? newTxs[newTxs.length - 1].id : "";
  }
  return txs;
};

export interface GraphTransactions {
  id: string;
  timestamp: string;
  hash: string;
  logIndex: string;
  market: { address: string };
  user: { address: string };
  type: TransactionType;
}

const query = `query GetTransactions($timestampFrom: BigInt!, $timestampTo: BigInt!, $nextId: ID!){
  transactions(first: 1000, where: {
    timestamp_gte: $timestampFrom
    timestamp_lt: $timestampTo
    id_gt: $nextId
  }) {
    timestamp
    id
    hash
    logIndex
    market {
      address
    }
    user {
      address
    }
    type
    
  }
}
`;
