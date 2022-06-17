import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = (): BigInt => BigInt.fromI32(10).pow(18 as u8);

export const initialIndex = (): BigInt => BigInt.fromI32(10).pow(36 as u8);