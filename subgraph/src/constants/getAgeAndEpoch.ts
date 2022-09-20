import { BigInt } from "@graphprotocol/graph-ts";
import { startTimestamps } from "./startTimestamps";
import { endTimestamps } from "./endTimestamps";

export const getAgeAndEpoch = (timestamp: BigInt): string | null => {
  if (timestamp.le(startTimestamps.get("age1-epoch1"))) return null; // no age before 2022-06-08T17:00:06.000Z
  if (timestamp.le(endTimestamps.get("age1-epoch1"))) return "age1-epoch1";
  if (timestamp.le(endTimestamps.get("age1-epoch2"))) return "age1-epoch2";
  if (timestamp.le(endTimestamps.get("age1-epoch3"))) return "age1-epoch3";
  if (timestamp.le(endTimestamps.get("age2-epoch1"))) return "age2-epoch1";
  return null;
};
