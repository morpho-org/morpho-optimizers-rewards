export default `query GetUsersBalances($lastUser: ID! $size: Int!){
  users(first: $size where: {id_gt: $lastUser}) {
    address
    balances {
      timestamp
      underlyingSupplyBalance
      underlyingBorrowBalance
      userSupplyIndex
      userBorrowIndex
      unclaimedMorpho
      market {
        address
        supplyIndex
        borrowIndex
        supplyUpdateBlockTimestamp
        borrowUpdateBlockTimestamp
        totalSupplyOnPool
        totalSupplyP2P
        totalBorrowOnPool
        totalBorrowP2P
        lastP2PBorrowIndex
        lastPoolBorrowIndex
        lastP2PSupplyIndex
        lastPoolSupplyIndex
      }
    }
  }
}

`;
