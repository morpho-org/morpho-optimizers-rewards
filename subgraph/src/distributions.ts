import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { endTimestamps, formattedEmissions, startTimestamps } from "./distributionStore";

export const epochNumberToStartTimestamp = (epochNumber: i32): BigInt | null => {
  if (!startTimestamps.has(epochNumber)) return null;
  return startTimestamps.get(epochNumber);
};
export const epochNumberToEndTimestamp = (epochNumber: i32): BigInt | null => {
  if (!endTimestamps.has(epochNumber)) return null;
  return endTimestamps.get(epochNumber);
};
export const timestampToEpochId = (timestamp: BigInt): i32 => {
  if (timestamp.le(BigInt.fromI32(1654707606))) return 0;
  let epoch = 1;
  while (true) {
    let endTimestamp = epochNumberToEndTimestamp(epoch);
    if (!endTimestamp) return epoch;
    if (timestamp.le(endTimestamp)) return epoch;
    epoch++;
  }
};
export const fetchDistribution = (timestamp: BigInt, side: string, market: Address): BigInt => {
  if (timestamp.lt(BigInt.fromI32(1654707606))) return BigInt.zero();
  const epochNumber = timestampToEpochId(timestamp);
  if (!epochNumber) {
    log.debug("IPFS file: no epoch id at ts {}", [timestamp.toString()]);
    return BigInt.zero();
  }
  const id = `epoch-${epochNumber}-${side}-${market.toHexString()}`;

  if (!formattedEmissions.has(id)) return BigInt.zero();
  return formattedEmissions.get(id);
};

export const fetchDistributionFromDistributionId = (id: string): BigInt => {
  if (!formattedEmissions.has(id)) return BigInt.zero();
  return formattedEmissions.get(id);
};
