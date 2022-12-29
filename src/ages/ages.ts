import { ageOneDistribution, ageTwoDistribution } from "./distributions";
import { BigNumber } from "ethers";
import { AgeConfig } from "./ages.types";
import { BASIS_POINTS } from "../helpers";
import { parseUnits } from "ethers/lib/utils";
import { ageThreeDistribution } from "./distributions/ageThreeDistribution";

/**
 * Check the docs for repartition explanation
 * https://docs.morpho.xyz/usdmorpho/ages-and-epochs
 */
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
        totalEmission: parseUnits("350000"),
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
        totalEmission: parseUnits("1700000"),
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
        totalEmission: parseUnits("2950000"),
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
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-rewards",

    epochs: [
      {
        id: "age2-epoch1",
        number: 4,
        epochName: "epoch1",
        snapshotBlock: 15_575_331, // https://etherscan.io/block/15575331
        initialTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
        initialBlock: 15_575_442,
        finalTimestamp: BigNumber.from(new Date("2022-10-24T15:00:00.000Z").getTime() / 1000),
        finalBlock: 15818711,
        totalEmission: parseUnits("3000000"),
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
        initialBlock: 15818712,
        finalBlock: 16062077,
        initialTimestamp: BigNumber.from(new Date("2022-10-24T15:00:00.000Z").getTime() / 1000),
        finalTimestamp: BigNumber.from(new Date("2022-11-27T15:00:00.000Z").getTime() / 1000),
        totalEmission: parseUnits("3400000"),
        protocolDistribution: {
          morphoCompound: BigNumber.from(6_500),
          morphoAave: BigNumber.from(3_500),
        },
      },
      {
        id: "age2-epoch3",
        number: 6,
        epochName: "epoch3",
        snapshotBlock: 16_061_781, // https://etherscan.io/block/16061781
        initialBlock: 16062078,
        initialTimestamp: BigNumber.from(new Date("2022-11-27T15:00:00.000Z").getTime() / 1000),
        finalTimestamp: BigNumber.from(new Date("2022-12-29T15:00:00.000Z").getTime() / 1000), // 17h CET
        totalEmission: parseUnits("3600000"),
        protocolDistribution: {
          morphoCompound: BigNumber.from(5_000),
          morphoAave: BigNumber.from(5_000),
        },
      },
    ],
  },
  {
    ageName: "age3",
    startTimestamp: BigNumber.from(new Date("2022-12-29T15:00:00.000Z").getTime() / 1000),
    endTimestamp: BigNumber.from(new Date("2023-04-07T15:00:00.000Z").getTime() / 1000),
    distribution: ageThreeDistribution,
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-rewards",
    epochs: [
      {
        id: "age3-epoch1",
        number: 7,
        epochName: "epoch1",
        snapshotProposal: "0xf402161143c42ac5edf6589b7833eb760cbe556e18451a232e6be3d34d06f287",
        snapshotBlock: 16290872,
        initialTimestamp: BigNumber.from(new Date("2022-12-29T15:00:00.000Z").getTime() / 1000),
        initialBlock: undefined,
        finalTimestamp: BigNumber.from(new Date("2023-02-01T15:00:00.000Z").getTime() / 1000),
        finalBlock: undefined,
        totalEmission: parseUnits("3333333"),
        protocolDistribution: undefined,
      },
      {
        id: "age3-epoch2",
        number: 8,
        epochName: "epoch2",
        snapshotBlock: undefined,
        initialTimestamp: BigNumber.from(new Date("2023-02-01T15:00:00.000Z").getTime() / 1000),
        initialBlock: undefined,
        finalTimestamp: BigNumber.from(new Date("2023-03-04T15:00:00.000Z").getTime() / 1000),
        finalBlock: undefined,
        totalEmission: parseUnits("3333333"),
        protocolDistribution: undefined,
      },
      {
        id: "age3-epoch3",
        number: 9,
        epochName: "epoch3",
        snapshotBlock: undefined,
        initialTimestamp: BigNumber.from(new Date("2023-03-04T15:00:00.000Z").getTime() / 1000),
        initialBlock: undefined,
        finalTimestamp: BigNumber.from(new Date("2023-04-07T15:00:00.000Z").getTime() / 1000),
        finalBlock: undefined,
        totalEmission: parseUnits("3333334"),
        protocolDistribution: undefined,
      },
    ],
  },
];

export const allEpochs = ages
  .map((age, ageId) =>
    age.epochs.map((epoch, epochId) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { epochs, ...ageConfig } = age;
      return { ...epoch, age: age.ageName, ageId, epochId, ageConfig };
    })
  )
  .flat();

export const finishedEpochs = allEpochs.filter((epoch) => epoch.finalTimestamp.lte(Math.round(Date.now() / 1000)));

export const startedEpochs = allEpochs.filter((epoch) => epoch.initialTimestamp.lte(Math.round(Date.now() / 1000)));

export const numberOfEpochs = allEpochs.length;
