import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();

export const one = BigInt.fromString("1");
export const VERSION_2_TIMESTAMP = BigInt.fromString("1675263600"); // age3 epoch 2 initial timestamp

export const BASIS_POINTS = BigInt.fromString("10000");
