import { Address, BigInt, ipfs, json, JSONValue, JSONValueKind, log, TypedMap } from "@graphprotocol/graph-ts";
import { IPFS_HASH } from "./ipfs";

export const ipfsJson = (): TypedMap<string, JSONValue> => {
  const data = ipfs.cat(IPFS_HASH);
  if (!data) {
    log.critical("No IPFS file", []);
    return new TypedMap<string, JSONValue>();
  }
  const jsonData = json.fromBytes(data);
  if (jsonData.kind !== JSONValueKind.OBJECT) {
    log.critical("Malformed IPFS file", []);
    return new TypedMap<string, JSONValue>();
  }
  const obj = jsonData.toObject();
  if (!obj) {
    log.critical("Malformed IPFS file", []);
    return new TypedMap<string, JSONValue>();
  }
  return obj;
};
export const epochNumberToStartTimestamp = (obj: TypedMap<string, JSONValue>, epochNumber: i32): BigInt | null => {
  if (!obj) return null;
  const startTimestamps = obj.get("startTimestamps");
  if (!startTimestamps) {
    log.critical("No startTimestamps", []);
    return null;
  }
  const ts = startTimestamps.toObject().get(`epoch-${epochNumber}`);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
};
export const epochNumberToEndTimestamp = (obj: TypedMap<string, JSONValue>, epochNumber: i32): BigInt | null => {
  if (!obj) return null;
  const endTimestamps = obj.get("endTimestamps");
  if (!endTimestamps) {
    log.critical("No endTimestamps", []);
    return null;
  }
  const ts = endTimestamps.toObject().get(`epoch-${epochNumber}`);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
};
export const timestampToEpochId = (obj: TypedMap<string, JSONValue>, timestamp: BigInt): i32 => {
  if (!obj) return 0;
  let ts = obj.get("startTimestamps");
  if (!ts) {
    log.critical("No startTimestamps", []);
    return 0;
  }
  const tsRaws = ts.toObject();
  if (!tsRaws) {
    log.critical("No timestamps", []);
    return 0;
  }
  if (timestamp.le(BigInt.fromI32(1654707606))) return 0;
  let epoch = 1;
  while (true) {
    let endTimestamp = epochNumberToEndTimestamp(obj, epoch);
    if (!endTimestamp) return epoch;
    if (timestamp.le(endTimestamp)) return epoch;
    epoch++;
  }
};
export const fetchDistribution = (
  obj: TypedMap<string, JSONValue>,
  timestamp: BigInt,
  side: string,
  market: Address
): BigInt => {
  if (timestamp.lt(BigInt.fromI32(1654707606))) return BigInt.zero();
  const epochNumber = timestampToEpochId(obj, timestamp);
  if (!epochNumber) {
    log.debug("IPFS file: no epoch id at ts {}", [timestamp.toString()]);
    return BigInt.zero();
  }
  const id = `epoch-${epochNumber}-${side}-${market.toHexString()}`;
  const formattedEmissions = obj.get("formattedEmissions");
  if (!formattedEmissions) {
    log.critical("No formattedEmissions", []);
    return BigInt.zero();
  }
  const emission = formattedEmissions.toObject().get(id);
  if (!emission) return BigInt.zero();
  return BigInt.fromString(emission.toString());
};

export const fetchDistributionFromDistributionId = (obj: TypedMap<string, JSONValue>, id: string): BigInt => {
  const formattedEmissions = obj.get("formattedEmissions");
  if (!formattedEmissions) {
    log.critical("No formattedEmissions", []);
    return BigInt.zero();
  }
  const emission = formattedEmissions.toObject().get(id);
  if (!emission) return BigInt.zero();
  return BigInt.fromString(emission.toString());
};
