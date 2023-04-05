import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();

export const one = BigInt.fromString("1");
export const VERSION_2_TIMESTAMP = BigInt.fromString(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935"
); // No planned yet

export const BASIS_POINTS = BigInt.fromString("10000");

export const SUPPLY = Bytes.fromUTF8("Supply");

export const BORROW = Bytes.fromUTF8("Borrow");
