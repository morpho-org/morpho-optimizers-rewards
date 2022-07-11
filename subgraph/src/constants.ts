import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = (): BigInt => BigInt.fromI32(10).pow(18 as u8);

export const initialIndex = (): BigInt => BigInt.zero(); //BigInt.fromI32(10 as i32).pow(18 as u8);
export const cEth = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5".toLowerCase();
