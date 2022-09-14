const query = `  {
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
        lastP2PBorrowIndex
        lastPoolBorrowIndex
        lastP2PSupplyIndex
        lastPoolSupplyIndex
        lastTotalBorrow
        lastTotalSupply
      }
    }
  }`;

const balancesQuery = `query GetUsersBalances($lastUser: ID! $size: Int!){
users(first: $size where: {id_gt: $lastUser})
 ${query}
}`;

const balancesQueryWithBlock = `query GetUsersBalancesWithBlock($lastUser: ID! $size: Int!, $block: Int!){
users(first: $size where: {id_gt: $lastUser} block: {number: $block})
 ${query}
}`;

export default {
  balancesQueryWithBlock,
  balancesQuery,
};
