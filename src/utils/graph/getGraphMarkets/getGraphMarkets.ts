import { GraphMarketConfiguration, MarketMinimal } from "./markets.types";
import { query, subgraphUrl } from "./markets.query";
import { graphToMarketConfig } from "./markets.formatter";

/**
 * Fetch markets configuration at the beginning of the epoch
 * @param blockTag
 */
export const getGraphMarkets = async (blockTag: number) => {
  const marketsConfiguration: { [market: string]: MarketMinimal } = {};
  await fetch(subgraphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { blockTag } }),
  })
    .then((result) => {
      console.log("result", result);
      if (!result.ok) return Promise.reject(result);
      return result.json();
    })
    .then((result: { data: { markets: GraphMarketConfiguration[] } | { error: any } }) => {
      console.log(result);
      if (!("markets" in result.data)) throw Error(result.data.toString());

      result.data.markets.forEach((graphMarket) => {
        marketsConfiguration[graphMarket.address] = graphToMarketConfig(graphMarket);
      });
    });
  return marketsConfiguration;
};
