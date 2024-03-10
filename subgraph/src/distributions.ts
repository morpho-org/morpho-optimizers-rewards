import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { emissions, epochToEndTimestamps, epochToStartTimestamps } from "./generated-emissions";


export const epochNumberToStartTimestamp = (epochNumber: i32): BigInt | null => {

  const ts = epochToStartTimestamps.get(`epoch-${epochNumber}`);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
};
export const epochNumberToEndTimestamp = (epochNumber: i32): BigInt | null => {
  const ts = epochToEndTimestamps.get(`epoch-${epochNumber}`);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
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
export const fetchDistribution = (
  timestamp: BigInt,
  side: string,
  market: Address
): BigInt => {
  if (timestamp.lt(BigInt.fromI32(1654707606))) return BigInt.zero();
  const epochNumber = timestampToEpochId(timestamp);
  if (!epochNumber) {
    log.debug("No epoch id at ts {}", [timestamp.toString()]);
    return BigInt.zero();
  }
  const id = `epoch-${epochNumber}-${side}-${market.toHexString()}`;
  return fetchDistributionFromDistributionId(id);
};

export const fetchDistributionFromDistributionId = (id: string): BigInt => {
  const emission = emissions.get(id);
  if (!emission) return BigInt.zero();
  return emission;
};
