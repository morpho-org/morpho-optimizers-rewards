import { GraphUser, GraphUserTxs } from "./users.types";
import axios from "axios";
import { BigNumber } from "ethers";
import { Balance } from "../types";
import balancesBlockQuery from "./balancesBlock.query";
import transactionsQuery from "./transactions.query";

export const fetchUsers = async (
  graphUrl: string,
  startBlock: number,
  markets: string[],
  startTimestamp: number,
  endTimestamp: number
): Promise<{ [user: string]: Balance[] }> => {
  let hasMore = true;
  const batchSize = 1000;
  const userTxs: { [user: string]: Balance[] } = await fetchInitialBalance(graphUrl, startBlock);

  let offset = "";

  while (hasMore) {
    const params = {
      batchSize,
      lastID: offset,
      startEpoch: startTimestamp,
      endEpoch: endTimestamp,
    };
    const newTxs = await fetchBatchTransactions<GraphUserTxs>(graphUrl, transactionsQuery, params);

    hasMore = newTxs.length === batchSize;
    offset = newTxs.length > 0 ? newTxs[newTxs.length - 1].id : "";
    newTxs.forEach((transaction) => {
      const balance: Balance = {
        market: transaction.market.address,
        underlyingBorrowBalance: BigNumber.from(transaction.underlyingBorrowBalance),
        underlyingSupplyBalance: BigNumber.from(transaction.underlyingSupplyBalance),
        blockNumber: +transaction.blockNumber,
        timestamp: BigNumber.from(transaction.timestamp),
      };
      if (!Array.isArray(userTxs[transaction.user.address]))
        userTxs[transaction.user.address] = [balance];
      else userTxs[transaction.user.address].push(balance);
    });
  }

  return userTxs;
};

interface GraphResult<T> {
  data: { data: T };
}

const fetchBatchTransactions = async <U>(graphUrl: string, query: string, variables: object) =>
  axios
    .post<{ query: string; variables: object }, GraphResult<{ transactions: U[] }>>(graphUrl, {
      query,
      variables,
    })
    .then((r) => {
      console.log(r.data);
      return r.data.data.transactions;
    });
const fetchBatch = async <U>(graphUrl: string, query: string, variables: object) =>
  axios
    .post<{ query: string; variables: object }, GraphResult<{ users: U[] }>>(graphUrl, {
      query,
      variables,
    })
    .then((r) => r.data.data.users);

/**
 * Make a snapshot of the user balances at the beginning of the epoch
 * @param graphUrl
 * @param blockTag
 */
const fetchInitialBalance = async (graphUrl: string, blockTag: number) => {
  let hasMore = true;
  const batchSize = 1000;

  const userTxs: { [user: string]: Balance[] } = {};
  let offset = "";
  while (hasMore) {
    const params = {
      batchSize,
      lastID: offset,
      blockTag,
    };
    const newGraphUsers = await fetchBatch<GraphUser>(graphUrl, balancesBlockQuery, params).then(
      (r) =>
        r.map(({ address, balances: initialBalances }) => {
          userTxs[address] = initialBalances.map((initialBalance) => ({
            timestamp: BigNumber.from(initialBalance.timestamp),
            blockNumber: +initialBalance.blockNumber,
            market: initialBalance.market.address,
            underlyingSupplyBalance: BigNumber.from(initialBalance.underlyingSupplyBalance),
            underlyingBorrowBalance: BigNumber.from(initialBalance.underlyingBorrowBalance),
          }));
          return address;
        })
    );
    hasMore = newGraphUsers.length === batchSize;
    offset = newGraphUsers.length > 0 ? newGraphUsers[newGraphUsers.length - 1] : "";
  }

  return userTxs;
};
