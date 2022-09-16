import { BigNumber, BigNumberish } from "ethers";
import axios from "axios";
import { GraphTransaction } from "./graphTransactions.types";

export const getGraphTransaction = async (graphUrl: string, timestampFrom: BigNumberish, timestampTo: BigNumberish) => {
  const variables = {
    timestampFrom: BigNumber.from(timestampFrom).toString(),
    timestampTo: BigNumber.from(timestampTo).toString(),
  };
  let txs: GraphTransaction[] = [];
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
      .then((r) => r.data.data.transactions as GraphTransaction[]);
    txs = [...txs, ...newTxs];
    hasMore = newTxs.length === 1000;
    nextId = newTxs.length > 0 ? newTxs[newTxs.length - 1].id : "";
  }
  return txs;
};

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
