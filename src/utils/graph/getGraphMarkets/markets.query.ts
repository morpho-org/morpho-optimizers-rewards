// Private fork of https://thegraph.com/hosted-service/subgraph/morpho-labs/morphocompoundmainnet
export const subgraphUrl =
  process.env.EPOCH_ONE_SUBGRAPH ??
  `https://subgraph.satsuma-prod.com/${process.env.SATSUMA_QUERY_KEY}/f0ca4a9fe1e73cae190fd171401794af36c918f81fcc8040ef85efb9628aa865/morphocompoundmainnet/api`;

export const query = `query MarketsConfiguration($blockTag: Int!){
markets(first: 128 block: {number: $blockTag}) {
    address
    symbol
    p2pIndexCursor
    reserveData {
      usd
      supplyPoolIndex
      borrowPoolIndex
    }
    token {
      decimals
    }
    metrics {
      totalBorrowOnPool
      totalSupplyOnPool
     
      borrowBalanceInP2P
      borrowBalanceOnPool
      supplyBalanceInP2P
      supplyBalanceOnPool
    }
  p2pData {
    p2pSupplyIndex
    p2pBorrowIndex
  }
  }
}`;
