export default `query GetMorphoCompoundAccounts($batchSize: Int!, $lastID: ID!, $startEpoch: Int!, $endEpoch: Int!){
  users(first: $batchSize, where: {id_gt: $lastID}) {
    address
    balances(where: {
      timestamp_gte: $startEpoch
      timestamp_lt: $endEpoch
    }) {
      id
      type
      market
      timestamp
      blockNumber
      underlyingSupplyBalance
      underlyingBorrowBalance
    }
  }
}

`;
