import { BigNumber } from "ethers";

export default {
  ageName: "age1",
  epochs: {
    epoch1: {
      initialBlock: 14927832, // https://etherscan.io/block/14927832
      initialTimestamp: BigNumber.from(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000),
      finalTimestamp: BigNumber.from(new Date("2022-07-13T17:00:00.000Z").getTime() / 1000), // now
      totalEmission: BigNumber.from(350_000),
      subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morphoages",
      epochName: "epoch1",
    },
  },
};
