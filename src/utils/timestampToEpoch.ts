import { BigNumberish } from "ethers";
import { ages, EpochConfig } from "../ages";

export const timestampToEpoch = (timestamp: BigNumberish) => {
  const age = timestampToAge(timestamp);
  if (!age) return;
  const epoch = Object.values(ages[age].epochs).find(
    (epoch) => epoch.initialTimestamp.lte(timestamp) && epoch.finalTimestamp.gt(timestamp),
  );
  if (!epoch) return;
  return {
    age,
    epoch,
  };
};

export const getEpochsBetweenTimestamps = (t1: BigNumberish, t2: BigNumberish) => {
  const epoch1 = timestampToEpoch(t1);
  if (!epoch1) return;
  const epoch2 = timestampToEpoch(t2);
  const epochs = [epoch1];

  let newEpoch: typeof epoch1 | undefined = epoch1;
  while (
    newEpoch?.epoch?.epochName &&
    `${newEpoch?.age}${newEpoch?.epoch?.epochName}` !== `${epoch2?.age}${epoch2?.epoch?.epochName}`
  ) {
    newEpoch = getNextEpoch(newEpoch.age, (newEpoch?.epoch?.epochName as string) ?? "");

    if (newEpoch && newEpoch?.epoch?.initialTimestamp.lt(t2)) epochs.push(newEpoch);
    else break;
  }
  return epochs;
};

export const getNextEpoch = (age: string, epoch: string) => {
  const currentAgeEpochs = Object.keys(ages[age].epochs);
  const isLastEpoch = currentAgeEpochs.indexOf(epoch as string) === currentAgeEpochs.length - 1;
  if (isLastEpoch) {
    // we change the age
    const agesKeys = Object.keys(ages);
    const currentKey = agesKeys.indexOf(age as string);
    if (currentKey === agesKeys.length - 1) return; // no next age
    return {
      age: agesKeys[currentKey + 1],
      epoch: ages[agesKeys[currentKey + 1]].epochs["epoch1"] as EpochConfig,
    };
  }
  return {
    age,
    epoch: ages[age].epochs[currentAgeEpochs.indexOf(epoch as string) + 1] as EpochConfig,
  };
};

export const timestampToAge = (timestamp: BigNumberish) => {
  const ageEntry = Object.values(ages).find(
    (ageConfig) => ageConfig.startTimestamp.lte(timestamp) && ageConfig.endTimestamp.gt(timestamp),
  );
  return ageEntry?.ageName;
};
