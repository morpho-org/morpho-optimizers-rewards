import { BigInt } from "@graphprotocol/graph-ts";

export const getAgeAndEpoch = (timestamp: BigInt): string | null => {
  if (timestamp.le(BigInt.fromI32(1654707606))) return null; // no age before 2022-06-08T17:00:06.000Z
  if (timestamp.le(BigInt.fromI32(1657731600))) return "ageOne-epochOne";
  if (timestamp.le(BigInt.fromI32(1660669200))) return "ageOne-epochTwo";
  if (timestamp.le(BigInt.fromI32(1663686000))) return "ageOne-epochThree";
  return null;
};
