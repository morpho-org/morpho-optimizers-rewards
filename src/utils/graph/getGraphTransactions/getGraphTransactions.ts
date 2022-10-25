import { BigNumber, BigNumberish } from "ethers";
import axios from "axios";
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
    const newTxs = await axios
      .post(graphUrl, {
        query,
        variables: {
          ...variables,
          nextId,
        },
      })
      .then((result) => {
        if (result.data.errors) throw new Error(result.data.errors[0].message);

        return result.data.data.transactions as GraphTransaction[];
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
