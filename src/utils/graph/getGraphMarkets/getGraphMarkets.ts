import axios from "axios";
import { GraphMarketConfiguration, MarketLight } from "./markets.types";
import { query, subgraphUrl } from "./markets.query";
import { graphToMarketConfig } from "./markets.formatter";

/**
 * Fetch markets configuration at the beginning of the epoch
 * @param blockTag
 */
export const getGraphMarkets = async (blockTag: number) => {
  const marketsConfiguration: { [market: string]: MarketLight } = {};

  await axios
    .post<{ blockTag: number }, { data?: { data: { markets: GraphMarketConfiguration[] } } }>(subgraphUrl, {
      query,
      variables: { blockTag },
    })
    .then((result) => {
      if (!result.data?.data) {
        throw Error(result.data!.toString());
      }
      result.data.data.markets.forEach((graphMarket) => {
        marketsConfiguration[graphMarket.address] = graphToMarketConfig(graphMarket);
      });
    });
  return marketsConfiguration;
};
