import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();

export const one = BigInt.fromString("1");
export const VERSION_2_TIMESTAMP = BigInt.fromString("1680879600"); // age4 epoch1 initial timestamp

export const BASIS_POINTS = BigInt.fromString("10000");

export const SUPPLY = Bytes.fromUTF8("Supply");

export const BORROW = Bytes.fromUTF8("Borrow");
