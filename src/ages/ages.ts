/* eslint-disable no-unused-vars */
import { ageOneDistribution } from "./age-one/distributions";
import { BigNumber } from "ethers";
import { MarketEmission } from "../utils";
import { Optional } from "../helpers/types";

export interface EpochConfig {
  snapshotBlock: number;
  initialTimestamp: BigNumber;
  finalTimestamp: BigNumber;
  initialBlock?: number;
  finalBlock?: number;
  totalEmission: BigNumber;
  epochName: keyof typeof ages[keyof typeof ages]["epochs"];
}

export type DistributionFunction = (
  snapshotBlock: number,
  totalEmission: BigNumber,
  duration: BigNumber
) => Promise<{ marketsEmissions: { [p: string]: Optional<MarketEmission> } }>;

export interface AgeConfig {
  ageName: string;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  distribution: DistributionFunction;
  subgraphUrl: string;
  epochs: { [key: string]: EpochConfig };
}

export const ages: { [age: string]: AgeConfig } = {
  ["age1"]: {
    ageName: "age1",
    startTimestamp: BigNumber.from(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000),
    endTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
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
  },
  ["age2"]: {
    ageName: "age2",
    startTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
    endTimestamp: BigNumber.from(new Date("2022-12-20T15:00:00.000Z").getTime() / 1000),
    distribution: ageOneDistribution,
    subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-dev/morpho-rewards-staging",

    epochs: {
      epoch1: {
        snapshotBlock: 14_927_832, // https://etherscan.io/block/14927832
        initialTimestamp: BigNumber.from(new Date("2022-09-20T15:00:00.000Z").getTime() / 1000),
        initialBlock: 14_927_832,
        finalTimestamp: BigNumber.from(new Date("2022-10-20T15:00:00.000Z").getTime() / 1000),
        finalBlock: 15_135_480,
        totalEmission: BigNumber.from(350_000),
        epochName: "epoch1",
      },
      epoch2: {
        snapshotBlock: 15_134_933, // https://etherscan.io/block/15134933
        initialTimestamp: BigNumber.from(new Date("2022-10-20T15:00:00.000Z").getTime() / 1000),
        initialBlock: 15_135_481,
        finalTimestamp: BigNumber.from(new Date("2022-11-20T15:00:00.000Z").getTime() / 1000),
        finalBlock: 15_353_545,
        totalEmission: BigNumber.from(1_700_000),
        epochName: "epoch2",
      },
      epoch3: {
        snapshotBlock: 15_353_032, // https://etherscan.io/block/15353032
        initialTimestamp: BigNumber.from(new Date("2022-11-20T15:00:00.000Z").getTime() / 1000),
        initialBlock: 15_353_547,
        finalTimestamp: BigNumber.from(new Date("2022-12-20T15:00:00.000Z").getTime() / 1000), // 17h CET
        finalBlock: undefined,
        totalEmission: BigNumber.from(2_950_000),
        epochName: "epoch3",
      },
    },
  },
};
