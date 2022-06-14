import { GraphUser } from "./users.types";
import axios from "axios";
import { BigNumber } from "ethers";
import { Balance, TransactionType, User } from "../types";
import balancesQuery from "./balances.query";
import usersQuery from "./users.query";
import { getUserBalances } from "../markets";

export const fetchUsers = async (
  graphUrl: string,
  startBlock: number,
  markets: string[],
  startTimestamp: number,
  endTimestamp: number
): Promise<User[]> => {
  let hasMore = true;
  const batchSize = 1000;
  let users: User[] = await fetchInitialBalance(
    graphUrl,
    startBlock,
    startTimestamp,
    markets
  );
  let offset = "";
  while (hasMore) {
    const params = {
      batchSize,
      lastID: offset,
      startEpoch: startTimestamp,
      endEpoch: endTimestamp,
    };
    const newGraphUsers = await fetchBatch<GraphUser>(
      graphUrl,
      balancesQuery,
      params
    );
    hasMore = newGraphUsers.length === batchSize;
    offset =
      newGraphUsers.length > 0
        ? newGraphUsers[newGraphUsers.length - 1].address
        : "";
    console.log("Balances:", newGraphUsers.length, "Users loaded");

    const newUsers = await Promise.all(
      newGraphUsers.map(async (graphUser) => {
        const balances: Balance[] = await Promise.all(
          graphUser.balances.map(async (b) => ({
            ...b,
            timestamp: BigNumber.from(b.timestamp),
            underlyingBorrowBalance: BigNumber.from(b.underlyingBorrowBalance),
            underlyingSupplyBalance: BigNumber.from(b.underlyingSupplyBalance),
          }))
        );
        const userIndex = users.findIndex(
          (initialUser) =>
            initialUser.address.toLowerCase() === graphUser.address
        );
        if (userIndex !== null && userIndex !== undefined) {
          const initialUser = users[userIndex];
          users[userIndex] = {
            address: graphUser.address,
            balances: [...initialUser.balances, ...balances],
          };
          return;
        }
        return {
          address: graphUser.address,
          balances,
        };
      })
    ).then((r) => r.filter(Boolean) as User[]);
    users = [...users, ...newUsers];
  }

  return users;
};

interface GraphResult<T> {
  data: { data: { users: T[] } };
}

const fetchBatch = async <U>(
  graphUrl: string,
  query: string,
  variables: object
) =>
  axios
    .post<{ query: string; variables: object }, GraphResult<U>>(graphUrl, {
      query,
      variables,
    })
    .then((r) => r.data.data.users);

const fetchInitialBalance = async (
  graphUrl: string,
  blockTag: number,
  initialTimestamp: number,
  markets: string[]
) => {
  console.log("Fetch initial balances");
  let hasMore = true;
  const batchSize = 5;
  let initialUsers: User[] = [];
  let offset = "";
  while (hasMore) {
    const params = {
      batchSize,
      lastID: offset,
    };
    const newGraphUsers = await fetchBatch<{ address: string }>(
      graphUrl,
      usersQuery,
      params
    );
    console.log("Initial Balances:", newGraphUsers.length, "Users loaded");
    hasMore = newGraphUsers.length === batchSize;
    offset =
      newGraphUsers.length > 0
        ? newGraphUsers[newGraphUsers.length - 1].address
        : "";

    const newInitialUsers = await Promise.all(
      newGraphUsers.map(async (graphUser) => {
        const balances = await Promise.all(
          markets.map(async (market) => {
            const balances = await getUserBalances(
              graphUser.address,
              market,
              blockTag
            );
            return [
              {
                timestamp: BigNumber.from(initialTimestamp),
                blockNumber: blockTag,
                market,
                type: TransactionType.Supply,
                ...balances,
              },
              {
                timestamp: BigNumber.from(initialTimestamp),
                blockNumber: blockTag,
                market,
                type: TransactionType.Borrow,
                ...balances,
              },
            ];
          })
        ).then((r) => r.flat());
        return {
          address: graphUser.address,
          balances,
        };
      })
    );
    initialUsers = [...initialUsers, ...newInitialUsers];
  }

  return initialUsers;
};
