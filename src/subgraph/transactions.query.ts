export default `query GetMorphoCompoundAccounts($batchSize: Int!, $lastID: ID!, $startEpoch: Int!, $endEpoch: Int!){
  transactions(first: $batchSize, where: {
      id_gt: $lastID 
      timestamp_gt: $startEpoch
      timestamp_lt: $endEpoch
      }) {
      id
      type
      market {address}
      user {address}
      timestamp
      blockNumber
      underlyingSupplyBalance
      underlyingBorrowBalance
  }
}`;
