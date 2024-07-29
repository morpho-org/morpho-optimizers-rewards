export const SUBGRAPH_URL = () =>
  process.env.SUBGRAPH_URL ??
  `https://subgraph.satsuma-prod.com/${process.env.SATSUMA_QUERY_KEY}/f0ca4a9fe1e73cae190fd171401794af36c918f81fcc8040ef85efb9628aa865/morpho-optimizers-rewards/api`;
