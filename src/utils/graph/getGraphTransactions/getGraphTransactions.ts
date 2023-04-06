import { BigNumber, BigNumberish } from "ethers";
import { GraphTransaction } from "./graphTransactions.types";

export const getGraphTransactions = async (
  graphUrl: string,
  timestampFrom: BigNumberish,
  timestampTo: BigNumberish,
  target: string
) => {
  const variables = {
    timestampFrom: BigNumber.from(timestampFrom).toString(),
    timestampTo: BigNumber.from(timestampTo).toString(),
    target,
  };
  let txs: GraphTransaction[] = [];
  let hasMore = true;
  let nextId = "";
  while (hasMore) {
    const newTxs = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          ...variables,
          nextId,
        },
      }),
    })
      .then((result) => {
        if (!result.ok) return Promise.reject(result);
        return result.json();
      })
      .then((result: { data: { transactions: GraphTransaction[] } | { error: any } }) => {
        if (!("transactions" in result.data)) throw Error(result.data.toString());
        return result.data.transactions;
      });
    txs = [...txs, ...newTxs];
    hasMore = newTxs.length === 1000;
    nextId = newTxs.length > 0 ? newTxs[newTxs.length - 1].id : "";
  }
  return txs;
};

const query = `query GetTransactions($timestampFrom: BigInt!, $timestampTo: BigInt!, $nextId: ID!, $target: Bytes!){
  transactions(first: 1000, where: {
    timestamp_gte: $timestampFrom
    timestamp_lt: $timestampTo
    id_gt: $nextId
    target: $target
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
