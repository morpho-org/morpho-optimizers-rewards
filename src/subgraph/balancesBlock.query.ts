export default `query GetMorphoCompoundAccounts($batchSize: Int!, $lastID: ID!, $blockTag: Int!){
  users(first: $batchSize, where: {id_gt: $lastID}, block: {number: $blockTag}) {
    address
    balances(first: 128) {
      market {
        address
      }
      timestamp
      blockNumber
      underlyingSupplyBalance
      underlyingBorrowBalance
    }
  }
}

`;
