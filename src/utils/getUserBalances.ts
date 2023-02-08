import balancesQuery from "./graph/getGraphBalances/balances.query";
import { formatGraphBalances, GraphUserBalances } from "./graph";

const extractSubgraphBody = (status: number, body: string) => {
  try {
    const data = JSON.parse(body) as QueryUserBalancesResponse;
    const errors = data?.errors ? JSON.stringify(data.errors) : body;
    const errorMessage = `[${status}] - ${errors}`;
    return <const>[data, errorMessage];
  } catch (error) {
    return <const>[null, body];
  }
};
export const getUserBalances = async (graphUrl: string, user: string, block?: number) => {
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: block ? balancesQuery.queryWithBlock : balancesQuery.query,
      variables: { user, block },
    }),
  });
  const body = await res.text();
  const [data, errorMessage] = extractSubgraphBody(res.status, body);
  if (!res.ok || !data?.data) throw Error(errorMessage);
  if (!data.data.user) return undefined;
  return formatGraphBalances(data.data.user);
};
type QueryUserBalancesResponse = { data?: { user?: GraphUserBalances }; errors?: any };
