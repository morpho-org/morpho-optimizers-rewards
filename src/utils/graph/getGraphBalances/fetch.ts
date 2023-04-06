import balancesQuery from "./balances.query";
import { formatGraphBalances } from "./graphBalances.formatter";
import { providers } from "ethers";
import { GraphUserBalances, UserBalances } from "./balances.types";

export const fetchUsers = async (graphUrl: string, block?: providers.BlockTag) => {
  let hasMore = true;
  const batchSize = 1000;
  let usersBalances: UserBalances[] = [];

  let offset = "";

  while (hasMore) {
    const newBalances = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: block ? balancesQuery.balancesQueryWithBlockPaginated : balancesQuery.balancesQueryPaginated,
        variables: { size: batchSize, lastUser: offset, block },
      }),
    })
      .then((result) => {
        console.log("result", result);
        if (!result.ok) return Promise.reject(result);
        return result.json();
      })
      .then((result: { data: { users: GraphUserBalances[] } | { error: any } }) => {
        console.log(result);
        if (!("users" in result.data)) throw Error(result.data.toString());
        return result.data.users.map(formatGraphBalances);
      });

    hasMore = newBalances.length === batchSize;
    offset = newBalances.length > 0 ? newBalances[newBalances.length - 1].id : "";
    usersBalances = [...usersBalances, ...newBalances];
  }

  return usersBalances;
};
