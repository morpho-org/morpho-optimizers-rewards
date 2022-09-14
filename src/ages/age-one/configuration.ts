import { BigNumber } from "ethers";
import { ageOneDistribution } from "./distributions";

export default {
  ageName: "age1",
  distribution: ageOneDistribution,
  subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-dev/morpho-rewards-staging",
  epochs: {
    epoch1: {
      snapshotBlock: 14_927_832, // https://etherscan.io/block/14927832
      initialTimestamp: BigNumber.from(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000),
      initialBlock: 14_927_832,
      finalTimestamp: BigNumber.from(new Date("2022-07-13T17:00:00.000Z").getTime() / 1000),
      finalBlock: 15_135_480,
      totalEmission: BigNumber.from(350_000),
      epochName: "epoch1",
    },
    epoch2: {
      snapshotBlock: 15_134_933, // https://etherscan.io/block/15134933
      initialTimestamp: BigNumber.from(new Date("2022-07-13T17:00:06.000Z").getTime() / 1000),
      initialBlock: 15_135_481,
      finalTimestamp: BigNumber.from(new Date("2022-08-16T17:00:00.000Z").getTime() / 1000),
      finalBlock: 15_353_545,
      totalEmission: BigNumber.from(1_700_000),
      epochName: "epoch2",
    },
    epoch3: {
      snapshotBlock: 15_353_032, // https://etherscan.io/block/15353032
      initialTimestamp: BigNumber.from(new Date("2022-08-16T17:00:06.000Z").getTime() / 1000),
      initialBlock: 15_353_547,
      finalTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000), // 17h CET
      finalBlock: undefined,
      totalEmission: BigNumber.from(2_950_000),
      epochName: "epoch3",
    },
  },
};
