import { BigNumberish } from "ethers";
import { ages } from "../ages";

export const timestampToEpoch = (timestamp: BigNumberish) => {
  const age = timestampToAge(timestamp);
  if (!age) return;
  const epoch = Object.values(ages[age].epochs).find(
    (epoch) => epoch.initialTimestamp.gte(timestamp) && epoch.finalTimestamp.lt(timestamp),
  );
  return {
    age,
    epoch,
  };
};
export const timestampToAge = (timestamp: BigNumberish) => {
  const ageEntry = Object.values(ages).find(
    (ageConfig) => ageConfig.startTimestamp.gte(timestamp) && ageConfig.endTimestamp.lt(timestamp),
  );
  return ageEntry?.ageName as keyof typeof ages | undefined;
};
