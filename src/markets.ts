import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { Market } from "./types";
import axios from "axios";

const subgraphUrl = "https://api.thegraph.com/subgraphs/name/morpho-labs/morphocompoundmainnet";

const query = `query MarketsConfiguration($blockTag: Int!){
markets(first: 128 block: {number: $blockTag}) {
    address
    symbol
    p2pIndexCursor
    reserveData {
      usd
      supplyPoolIndex
    }
    metrics {
      totalBorrowOnPool
      totalSupplyOnPool
    }
  }
}`;

interface GraphMarketConfiguration {
  address: string;
  symbol: string;
  p2pIndexCursor: string;
  reserveData: {
    usd: string;
    supplyPoolIndex: string;
  };
  metrics: {
    totalBorrowOnPool: string;
    totalSupplyOnPool: string;
  };
}
const graphToMarketConfig = (graphMarket: GraphMarketConfiguration) => ({
  address: graphMarket.address,
  price: BigNumber.from(graphMarket.reserveData.usd),
  totalSupply: BigNumber.from(graphMarket.metrics.totalSupplyOnPool)
    .mul(graphMarket.reserveData.supplyPoolIndex)
    .div(parseUnits("1")),
  totalBorrow: BigNumber.from(graphMarket.metrics.totalBorrowOnPool),
  p2pIndexCursor: BigNumber.from(graphMarket.p2pIndexCursor),
});

/**
 * Fetch markets configuration at the beginning of the epoch
 * @param blockTag
 */
export const getMarketsConfiguration = async (blockTag: number) => {
  const marketsConfiguration: { [market: string]: Market } = {};

  await axios
    .post<{ blockTag: number }, { data?: { data: { markets: GraphMarketConfiguration[] } } }>(subgraphUrl, {
      query,
      variables: { blockTag },
    })
    .then((result) => {
      if (!result.data?.data) {
        console.error(result.data);
        throw Error(result.data!.toString());
      }
      result.data.data.markets.forEach((graphMarket) => {
        marketsConfiguration[graphMarket.address] = graphToMarketConfig(graphMarket);
      });
    });
  return marketsConfiguration;
};
