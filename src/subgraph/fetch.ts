import { GraphUser } from "./users.types";
import axios from "axios";
import usersQuery from "./users.query";
import { BigNumber } from "ethers";
import { Balance, User } from "../types";

export const fetchUsers = async (
  graphUrl: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<User[]> => {
  let hasMore = true;
  const batchSize = 1000;
  let users: User[] = [];
  let offset = "";
  while (hasMore) {
    const params = {
      batchSize,
      lastID: offset,
      startEpoch: startTimestamp,
      endEpoch: endTimestamp,
    };
    const newGraphUsers = await fetchBatch(graphUrl, params);
    hasMore = newGraphUsers.length === batchSize;
    offset =
      newGraphUsers.length > 0
        ? newGraphUsers[newGraphUsers.length - 1].address
        : "";

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
        return {
          address: graphUser.address,
          balances,
        };
      })
    );
    users = [...users, ...newUsers];
  }
  return users;
};

interface GraphResult {
  data: { data: { users: GraphUser[] } };
}

const fetchBatch = async <T extends Object>(graphUrl: string, variables: T) =>
  axios
    .post<{ query: string; variables: T }, GraphResult>(graphUrl, {
      query: usersQuery,
      variables,
    })
    .then((r) => r.data.data.users);
