export const subgraphUrl = "https://api.thegraph.com/subgraphs/name/morpho-labs/morphocompoundmainnet";

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
