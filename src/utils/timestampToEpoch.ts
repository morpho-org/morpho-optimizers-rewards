import { BigNumberish } from "ethers";
import { AgeConfig, allEpochs, EpochConfig } from "../ages";
import { Optional } from "../helpers/types";

export const timestampToEpoch = (timestamp: BigNumberish) =>
  allEpochs.find(({ epoch }) => epoch.initialTimestamp.lte(timestamp) && epoch.finalTimestamp.gt(timestamp));

export const getEpochsBetweenTimestamps = (tFrom: BigNumberish, tTo: BigNumberish) => {
  const epochFrom = timestampToEpoch(tFrom);
  if (!epochFrom) return;
  const epochTo = timestampToEpoch(tTo);
  const epochs = [epochFrom];
  if (!epochTo) return epochs;

  let newEpoch: Optional<{
    age: Omit<AgeConfig, "epochs">;
    epoch: EpochConfig;
  }> = epochFrom;
  while (newEpoch?.epoch?.epochName && newEpoch.epoch.number !== epochTo.epoch.number) {
    newEpoch = newEpoch.epoch.number ? getNextEpoch(newEpoch.epoch.number) : undefined;

    if (newEpoch && newEpoch?.epoch?.initialTimestamp.lt(tTo)) epochs.push(newEpoch);
    else break;
  }
  return epochs;
};

export const getNextEpoch = (epochNumber: number) => {
  const currentEpoch = getEpochFromNumber(epochNumber);
  if (!currentEpoch) throw Error(`Unknown epoch: ${epochNumber}`);

  const currentEpochId = allEpochs.indexOf(currentEpoch);
  if (currentEpochId === allEpochs.length - 1) return;

  return allEpochs[currentEpochId + 1];
};

export const getPrevEpoch = (epochNumber?: number) => {
  if (!epochNumber) return;
  const currentEpochIndex = allEpochs.findIndex(({ epoch }) => epoch.number === epochNumber);
  if (currentEpochIndex === -1) throw Error(`Unknown epoch: ${epochNumber}`);
  if (currentEpochIndex === 0) return; // This is the first epoch;
  return allEpochs[currentEpochIndex - 1];
};

export const getEpochFromNumber = (epochNumber: number) => allEpochs.find(({ epoch }) => epoch.number === epochNumber);
