const queryBody = `{
    address
    id
    balances {
      timestamp
      userSupplyIndex
      userBorrowIndex
      underlyingSupplyBalance
      underlyingBorrowBalance
      scaledSupplyOnPool
      scaledSupplyInP2P
      scaledBorrowOnPool
      scaledBorrowInP2P
      userSupplyOnPoolIndex
      userSupplyInP2PIndex
      userBorrowOnPoolIndex
      userBorrowInP2PIndex
      accumulatedSupplyMorphoV1
      accumulatedBorrowMorphoV1
      accumulatedSupplyMorphoV2
      accumulatedBorrowMorphoV2
      accumulatedSupplyMorpho
      accumulatedBorrowMorpho
      market {
        address
        supplyIndex
        poolSupplyIndex
        p2pSupplyIndex
        supplyUpdateBlockTimestamp
        supplyUpdateBlockTimestampV1
              
        borrowIndex
        poolBorrowIndex
        p2pBorrowIndex
        borrowUpdateBlockTimestamp
        borrowUpdateBlockTimestampV1
      
        lastPoolSupplyIndex
        lastP2PSupplyIndex
        lastPoolBorrowIndex
        lastP2PBorrowIndex
        lastTotalSupply
        lastTotalBorrow
      
        scaledSupplyOnPool
        scaledSupplyInP2P
        scaledBorrowOnPool
        scaledBorrowInP2P
      }
    }
  }`;
const query = `query GetUserBalances($user: ID!){
  user(id: $user) ${queryBody} 
}`;

const queryWithBlock = `query GetUserBalances($user: ID! $block: Int!){
  user(id: $user block: {number: $block}) ${queryBody}
}`;
const balancesQueryPaginated = `query GetUsersBalances($lastUser: ID! $size: Int!){
users(first: $size where: {id_gt: $lastUser})${queryBody}
}`;

const balancesQueryWithBlockPaginated = `query GetUsersBalancesWithBlock($lastUser: ID! $size: Int!, $block: Int!){
users(first: $size where: {id_gt: $lastUser} block: {number: $block})
 ${queryBody}
}`;

export default {
  balancesQueryWithBlockPaginated,
  balancesQueryPaginated,
  query,
  queryWithBlock,
};
