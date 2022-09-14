import axios from "axios";
import { GraphUserBalances, UserBalances } from "./types";
import balancesQuery from "./balances.query";
import { formatGraphBalances } from "./graphBalances.formater";
import { providers } from "ethers";

export const fetchUsers = async (graphUrl: string, block?: providers.BlockTag) => {
  let hasMore = true;
  const batchSize = 1000;
  let usersBalances: UserBalances[] = [];

  let offset = "";

  while (hasMore) {
    const newBalances = await axios
      .post<any, GraphResult<{ users: GraphUserBalances[] }>>(graphUrl, {
        query: block ? balancesQuery.balancesQueryWithBlock : balancesQuery.balancesQuery,
        variables: { size: batchSize, lastUser: offset, block },
      })
      .then((r) => {
        return r.data.data.users.map(formatGraphBalances);
      });

    hasMore = newBalances.length === batchSize;
    offset = newBalances.length > 0 ? newBalances[newBalances.length - 1].address : "";
    usersBalances = [...usersBalances, ...newBalances];
  }

  return usersBalances;
};

interface GraphResult<T> {
  data: { data: T };
}
