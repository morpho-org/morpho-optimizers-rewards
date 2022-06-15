import { BigNumber } from "ethers";

export default {
  initialBlock: 14911330,
  initialTimestamp: BigNumber.from(new Date("2022-06-06T00:00:00.000Z").getTime() / 1000),
  finalTimestamp: BigNumber.from(new Date("2022-06-14T00:00:00.000Z").getTime() / 1000), // now
  totalEmission: BigNumber.from(500_000),
  subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morphoages",
  ageName: "age1",
};
