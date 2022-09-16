import { BigNumberish } from "ethers";
import { AgeConfig, ages, EpochConfig } from "../ages/ages";
import { Optional } from "../helpers/types";

export const timestampToEpoch = (timestamp: BigNumberish) => {
  const epoch = allEpochs.find((epoch) => epoch.initialTimestamp.lte(timestamp) && epoch.finalTimestamp.gt(timestamp));
  if (!epoch) return;
  const age = ages[epoch.ageId];
  return {
    age: age as AgeConfig<EpochConfig>,
    epoch: age.epochs[epoch.epochId] as EpochConfig,
  };
};
const allEpochs = ages
  .map((age, ageId) => age.epochs.map((epoch, epochId) => ({ ...epoch, age: age.ageName, ageId, epochId })))
  .flat();

export const getEpochsBetweenTimestamps = (t1: BigNumberish, t2: BigNumberish) => {
  const epoch1 = timestampToEpoch(t1);
  if (!epoch1) return;
  const epoch2 = timestampToEpoch(t2);
  const epochs = [epoch1];
  if (!epoch2) return epochs;

  let newEpoch: Optional<{
    age: AgeConfig<EpochConfig>;
    epoch: EpochConfig;
  }> = epoch1;
  while (newEpoch?.epoch?.epochName && newEpoch.epoch.id !== epoch2.epoch.id) {
    newEpoch = getNextEpoch(newEpoch.age.ageName, newEpoch?.epoch?.epochName);

    if (newEpoch && newEpoch?.epoch?.initialTimestamp.lt(t2)) epochs.push(newEpoch);
    else break;
  }
  return epochs;
};

export const getNextEpoch = (age?: string, epoch?: string) => {
  if (!age || !epoch) return;
  const currentEpoch = allEpochs.find((_epoch) => _epoch.id === `${age}-${epoch}`);
  if (!currentEpoch) throw Error(`Unknown epoch: ${age}-${epoch}`);
  const currentEpochId = allEpochs.indexOf(currentEpoch);
  if (currentEpochId === allEpochs.length - 1) return;
  const nextEpoch = allEpochs[currentEpochId + 1];
  return {
    age: ages[nextEpoch.ageId] as AgeConfig<EpochConfig>,
    epoch: ages[nextEpoch.ageId].epochs[nextEpoch.epochId] as EpochConfig,
  };
};
