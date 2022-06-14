export default `query GetMorphoCompoundAccounts($batchSize: Int!, $lastID: ID!){
  users(first: $batchSize, where: {id_gt: $lastID}) {
    address
 }
}`;
