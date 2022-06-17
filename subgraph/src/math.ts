import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = () => BigInt.fromI32(10).pow(18 as u8);