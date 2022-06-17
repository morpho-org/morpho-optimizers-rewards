import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Morpho } from "../generated/Morpho/Morpho";
import { morphoAddresString } from "./config";

export function getUnderlyingBorrowBalance(
    morphoAddress: Address,
    marketAddress: Address,
    balanceOnPool: BigInt,
    balanceInP2P: BigInt
): BigInt {
    const morpho = Morpho.bind(Address.fromString(morphoAddresString));
    const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
    const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

    return balanceOnPool
        .times(lastPoolIndexes.value2)
        .plus(balanceInP2P)
        .times(p2pBorrowIndex)
        .div(BigInt.fromI32(10 as i32).pow(18 as u8));
}

export function getUnderlyingSupplyBalance(
    morphoAddress: Address,
    marketAddress: Address,
    balanceOnPool: BigInt,
    balanceInP2P: BigInt
): BigInt {
    const morpho = Morpho.bind(Address.fromString(morphoAddresString));
    const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
    const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);

    const underlyingSupplyBalance = balanceOnPool
        .times(lastPoolIndexes.value1)
        .plus(balanceInP2P)
        .times(p2pSupplyIndex)
        .div(BigInt.fromI32(10 as i32).pow(18 as u8));
    return underlyingSupplyBalance;
}