import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { DistributionFn } from "./distributionScripts/common";
import ageEpochConfig from "../age-epochs.json";
import { now, parseDate } from "../helpers";
import { blockFromTimestampWithRetry } from "../utils/etherscan/blockFromTimestamp";

export interface AgeEpochConfig {
  id: string;
  snapshotBlock?: number;
  initialTimestamp: string;
  finalTimestamp: string;
  distributionScript: string;
  distributionParameters: {
    totalEmission: string;
    [key: string]: any;
  };
}
export interface ParsedAgeEpochConfig {
  id: string;
  snapshotBlock?: number;
  initialTimestamp: number;
  initialBlock?: number;
  finalTimestamp: number;
  finalBlock?: number;
  distributionScript: DistributionFn;
  distributionParameters: {
    totalEmission: BigNumber;
    [key: string]: any;
  };
}

export const allEpochs: () => Promise<ParsedAgeEpochConfig[]> = () =>
  Promise.all(
    ageEpochConfig.map(async (epoch) => {
      const initialTimestamp = parseDate(epoch.initialTimestamp);
      const finalTimestamp = parseDate(epoch.finalTimestamp);

      const initialBlockPromise =
        initialTimestamp < now() ? blockFromTimestampWithRetry(initialTimestamp, "after") : undefined;
      const finalBlockPromise =
        finalTimestamp < now() ? blockFromTimestampWithRetry(finalTimestamp, "before") : undefined;

      const snapshotTs = initialTimestamp - 3600;

      const snapshotBlockPromise =
        snapshotTs < now() && !epoch.snapshotBlock ? blockFromTimestampWithRetry(snapshotTs, "after") : undefined;

      const [initialBlock, finalBlock, snapshotBlock] = await Promise.all([
        initialBlockPromise,
        finalBlockPromise,
        snapshotBlockPromise,
      ]);

      return {
        ...epoch,
        initialTimestamp,
        initialBlock,
        finalTimestamp,
        finalBlock,
        snapshotBlock: epoch.snapshotBlock || snapshotBlock,
        distributionScript: require(`./distributionScripts/${epoch.distributionScript}`).default,
        distributionParameters: {
          ...epoch.distributionParameters,
          totalEmission: parseUnits(epoch.distributionParameters.totalEmission),
        },
      };
    })
  );

export const timestampToEpoch = async (timestamp: number) => {
  const epochs = await allEpochs();
  const current = epochs.find((epoch) => epoch.initialTimestamp <= timestamp && epoch.finalTimestamp > timestamp);
  if (!current) throw new Error(`No epoch found for timestamp ${timestamp}`);
  return current;
};

export const epochsBetweenTimestamps = async (initialTimestamp: number, finalTimestamp: number) => {
  const epochs = await allEpochs();
  return epochs.filter(
    (epoch) =>
      epoch.finalTimestamp >= initialTimestamp && epoch.initialTimestamp <= finalTimestamp && !!epoch.snapshotBlock
  );
};

export const finishedEpochs = () => allEpochs().then((a) => a.filter((epoch) => epoch.finalTimestamp <= now()));

export const epochsBefore = (id: string, include = false) =>
  allEpochs().then((a) => {
    const index = a.findIndex((epoch) => epoch.id === id);
    if (index === -1) throw new Error(`No epoch found for id ${id}`);
    return a.slice(0, include ? index + 1 : index);
  });

export const startedEpochs = () => allEpochs().then((a) => a.filter((epoch) => epoch.initialTimestamp <= now()));

export const snapshotableEpochs = () => allEpochs().then((a) => a.filter((epoch) => epoch.snapshotBlock));

export const getEpoch = (id: string) =>
  allEpochs().then((a) => {
    const epoch = a.find((epoch) => epoch.id === id);
    if (!epoch) throw new Error(`No epoch found for id ${id}`);
    return epoch;
  });

export const currentEpoch = () => timestampToEpoch(now());

export const numberOfEpochs = ageEpochConfig.length;

export const epochNames = ageEpochConfig.map((epoch) => epoch.id);

export const rawEpochs: AgeEpochConfig[] = ageEpochConfig;
