import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { emissions, epochToEndTimestamps, epochToStartTimestamps } from "./generated-emissions";

export const epochNumberToStartTimestamp = (epochNumber: i32): BigInt | null => {
  const epochId = `epoch-${epochNumber}`;
  if (!epochToStartTimestamps.has(epochId)) {
    log.debug("No epoch start timestamp found for epoch {}", [epochNumber.toString()]);
    return null;
  }
  return epochToStartTimestamps.get(epochId);
};
export const epochNumberToEndTimestamp = (epochNumber: i32): BigInt | null => {
  const epochId = `epoch-${epochNumber}`;
  if (!epochToEndTimestamps.has(epochId)) {
    log.debug("No epoch end timestamp found for epoch {}", [epochNumber.toString()]);
    return null;
  }
  return epochToEndTimestamps.get(epochId);
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
    log.debug("No epoch id at ts {}", [timestamp.toString()]);
    return BigInt.zero();
  }
  const id = `epoch-${epochNumber}-${side}-${market.toHexString()}`;
  return fetchDistributionFromDistributionId(id);
};

export function fetchDistributionFromDistributionId(id: string): BigInt {
  if (!emissions.has(id)) {
    log.debug("No distribution found for id {}", [id]);
    return BigInt.zero();
  }
  return emissions.get(id);
}
