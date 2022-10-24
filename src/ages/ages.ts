import { ageOneDistribution, ageTwoDistribution } from "./distributions";
import { BigNumber } from "ethers";
import { AgeConfig } from "./ages.types";
import { BASIS_POINTS } from "../helpers";

export const ages: AgeConfig[] = [
  {
    ageName: "age1",
    startTimestamp: BigNumber.from(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000),
    endTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
    distribution: ageOneDistribution,
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-rewards",
    epochs: [
      {
        id: "age1-epoch1",
        number: 1,
        epochName: "epoch1",
        snapshotBlock: 14_927_832, // https://etherscan.io/block/14927832
        initialTimestamp: BigNumber.from(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000),
        initialBlock: 14_927_832,
        finalTimestamp: BigNumber.from(new Date("2022-07-13T17:00:00.000Z").getTime() / 1000),
        finalBlock: 15_135_480,
        totalEmission: BigNumber.from(350_000),
        protocolDistribution: {
          morphoCompound: BASIS_POINTS, // Rewards are distributed to morpho-compound on age 1
        },
      },
      {
        id: "age1-epoch2",
        number: 2,
        epochName: "epoch2",
        snapshotBlock: 15_134_933, // https://etherscan.io/block/15134933
        initialTimestamp: BigNumber.from(new Date("2022-07-13T17:00:06.000Z").getTime() / 1000),
        initialBlock: 15_135_481,
        finalTimestamp: BigNumber.from(new Date("2022-08-16T17:00:00.000Z").getTime() / 1000),
        finalBlock: 15_353_545,
        totalEmission: BigNumber.from(1_700_000),
        protocolDistribution: {
          morphoCompound: BASIS_POINTS, // Rewards are distributed to morpho-compound on age 1
        },
      },
      {
        id: "age1-epoch3",
        number: 3,
        epochName: "epoch3",
        snapshotBlock: 15_353_032, // https://etherscan.io/block/15353032
        initialTimestamp: BigNumber.from(new Date("2022-08-16T17:00:06.000Z").getTime() / 1000),
        initialBlock: 15_353_547,
        finalTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000), // 17h CET
        finalBlock: 15_575_441,
        totalEmission: BigNumber.from(2_950_000),
        protocolDistribution: {
          morphoCompound: BASIS_POINTS, // Rewards are distributed to morpho-compound on age 1
        },
      },
    ],
  },
  {
    ageName: "age2",
    startTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
    endTimestamp: BigNumber.from(new Date("2022-12-29T15:00:00.000Z").getTime() / 1000),
    distribution: ageTwoDistribution,
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-dev/morpho-rewards-staging",

    epochs: [
      {
        id: "age2-epoch1",
        number: 4,
        epochName: "epoch1",
        snapshotBlock: 15_575_331, // https://etherscan.io/block/15575331
        initialTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
        initialBlock: 15_575_442,
        finalTimestamp: BigNumber.from(new Date("2022-10-24T15:00:00.000Z").getTime() / 1000),
        totalEmission: BigNumber.from(3_000_000),
        protocolDistribution: {
          morphoCompound: BigNumber.from(9_000),
          morphoAave: BigNumber.from(1_000),
        },
      },
      {
        id: "age2-epoch2",
        number: 5,
        epochName: "epoch2",
        snapshotBlock: 15818122, // https://etherscan.io/block/15818122
        initialTimestamp: BigNumber.from(new Date("2022-10-24T15:00:00.000Z").getTime() / 1000),
        finalTimestamp: BigNumber.from(new Date("2022-11-27T15:00:00.000Z").getTime() / 1000),
        totalEmission: BigNumber.from(3_400_000),
        protocolDistribution: {
          morphoCompound: BigNumber.from(7_000),
          morphoAave: BigNumber.from(3_000),
        },
      },
      {
        id: "age2-epoch3",
        number: 6,
        epochName: "epoch3",
        snapshotBlock: undefined, // will be known at the beginning of the epoch
        initialTimestamp: BigNumber.from(new Date("2022-11-27T15:00:00.000Z").getTime() / 1000),
        finalTimestamp: BigNumber.from(new Date("2022-12-29T15:00:00.000Z").getTime() / 1000), // 17h CET
        totalEmission: BigNumber.from(3_600_000),
        protocolDistribution: {
          morphoCompound: BigNumber.from(6_000),
          morphoAave: BigNumber.from(4_000),
        },
      },
    ],
  },
];

export const allEpochs = ages
  .map((age, ageId) => age.epochs.map((epoch, epochId) => ({ ...epoch, age: age.ageName, ageId, epochId })))
  .flat();

export const numberOfEpochs = allEpochs.length;
