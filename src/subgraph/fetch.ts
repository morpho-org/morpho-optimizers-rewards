import { Balance, GraphUser, User } from "./users.types";
import axios from "axios";
import usersQuery from "./users.query";
import { BigNumber } from "ethers";
import { getUserBalancesUnderlying } from "../markets";

export const fetchUsers = async (
  graphUrl: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<User[]> => {
  let hasMore = true;
  const batchSize = 200;
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
          graphUser.transactions.map(async (tx) => ({
            timestamp: BigNumber.from(tx.eventTimestamp),
            blockNumber: tx.eventBlock,
            market: tx.market.address,
            type: tx.type,
            ...(await getUserBalancesUnderlying(
              tx.market.address,
              graphUser.address,
              tx.eventBlock
            )),
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
  data: { data: { accounts: GraphUser[] } };
}

const fetchBatch = async <T extends Object>(graphUrl: string, parameters: T) =>
  axios
    .post<{ query: string; parameters: T }, GraphResult>(graphUrl, {
      query: usersQuery,
      parameters,
    })
    .then((r) => r.data.data.accounts);
