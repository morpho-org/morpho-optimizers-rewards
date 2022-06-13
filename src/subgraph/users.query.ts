export default `query GetMorphoCompoundAccounts($batchSize: Int!, $lastID: ID!, $startEpoch: Int!, $endEpoch: Int!){
  accounts(first: $batchSize, where: {id_gt: $lastID}) {
    address
    transactions(where: {
      eventTimestamp_gte: $startEpoch
      eventTimestamp_lt: $endEpoch
    }) {
      id
      type
      market {
        address
      }
      eventTimestamp
      amount
      eventBlock
    }
  }
}

`;
