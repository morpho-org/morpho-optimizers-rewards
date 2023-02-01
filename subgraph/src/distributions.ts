import { Address, BigInt, ipfs, json, JSONValue, JSONValueKind, log, TypedMap } from "@graphprotocol/graph-ts";
import { one } from "./constants";

const IPFS_HASH = "QmT29MKM3i9UcP99efhrdae6yYr3T3CG39y6rvqDxM4tWx";
export const getNextId = (id: string): string => {
  const ageEpoch = id.split("-");
  const age = ageEpoch[0];
  const epoch = ageEpoch[1];
  const ageId = BigInt.fromString(age.replace("age", ""));
  const epochId = BigInt.fromString(epoch.replace("epoch", ""));
  if (epochId.equals(BigInt.fromString("3"))) return `age${ageId.plus(one).toString()}-epoch1`;
  return ("age" + ageId.toString() + "-epoch" + epochId.plus(one).toString()) as string;
};
export const getPrevId = (id: string): string | null => {
  if (id === "age1-epoch1") return null;
  const ageEpoch = id.split("-");
  const age = ageEpoch[0];
  const epoch = ageEpoch[1];
  const ageId = BigInt.fromString(age.replace("age", ""));
  const epochId = BigInt.fromString(epoch.replace("epoch", ""));
  if (epochId.equals(one)) return `age${ageId.minus(one).toString()}-epoch3`;
  return `age${ageId.toString()}-epoch${epochId.minus(one).toString()}` as string;
};

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
export const epochIdToStartTimestamp = (obj: TypedMap<string, JSONValue>, epochId: string): BigInt | null => {
  if (!obj) return null;
  const startTimestamps = obj.get("startTimestamps");
  if (!startTimestamps) {
    log.critical("No startTimestamps", []);
    return null;
  }
  const ts = startTimestamps.toObject().get(epochId);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
};
export const epochIdToEndTimestamp = (obj: TypedMap<string, JSONValue>, epochId: string): BigInt | null => {
  if (!obj) return null;
  const endTimestamps = obj.get("endTimestamps");
  if (!endTimestamps) {
    log.critical("No endTimestamps", []);
    return null;
  }
  const ts = endTimestamps.toObject().get(epochId as string);
  if (!ts) return null;
  return BigInt.fromString(ts.toString());
};
export const timestampToEpochId = (obj: TypedMap<string, JSONValue>, timestamp: BigInt): string | null => {
  if (!obj) return null;
  let ts = obj.get("startTimestamps");
  if (!ts) {
    log.critical("No startTimestamps", []);
    return null;
  }
  const tsRaws = ts.toObject();
  if (!tsRaws) {
    log.critical("No timestamps", []);
    return null;
  }
  if (timestamp.le(BigInt.fromI32(1654707606))) return null;
  let epoch = "age1-epoch1";
  while (true) {
    let endTimestamp = epochIdToEndTimestamp(obj, epoch);
    if (endTimestamp && endTimestamp.ge(timestamp)) return epoch;
    let nextEpoch = getNextId(epoch);
    let nextTimestamp = epochIdToStartTimestamp(obj, nextEpoch);
    if (!nextTimestamp) log.warning("Epoch Id: {}", [nextEpoch]);
    if (nextTimestamp && endTimestamp && timestamp.gt(endTimestamp) && timestamp.le(nextTimestamp)) return null; // between 2 epochs
    if (!nextTimestamp || (endTimestamp && endTimestamp.gt(timestamp))) return epoch; // last epoch considered as the current one
    epoch = nextEpoch;
  }
};
export const fetchDistribution = (
  obj: TypedMap<string, JSONValue>,
  timestamp: BigInt,
  side: string,
  market: Address
): BigInt => {
  if (timestamp.lt(BigInt.fromI32(1654707606))) return BigInt.zero();
  const epochId = timestampToEpochId(obj, timestamp);
  if (!epochId) {
    log.debug("IPFS file: no epoch id at ts {}", [timestamp.toString()]);
    return BigInt.zero();
  }
  const id = `${epochId as string}-${side}-${market.toHexString()}`;
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
