import { BigNumber } from "ethers";

export default {
  initialBlock: 14911330,
  initialTimestamp: BigNumber.from(1654465404),
  finalTimestamp: BigNumber.from(1655200262), // now
  totalEmission: BigNumber.from(5_000_000),
  subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morphoages",
  ageName: "age1",
};
