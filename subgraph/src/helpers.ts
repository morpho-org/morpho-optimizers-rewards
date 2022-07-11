import { BigInt } from "@graphprotocol/graph-ts";

export const maxBN = (a: BigInt, b: BigInt): BigInt => (a.gt(b) ? a : b);
