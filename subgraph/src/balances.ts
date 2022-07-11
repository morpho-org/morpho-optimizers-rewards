import { Address, BigInt } from "@graphprotocol/graph-ts";

import { Morpho } from "../generated/Morpho/Morpho";

import { WAD } from "./constants";

export function getUnderlyingBorrowBalance(
  morphoAddress: Address,
  marketAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt
): BigInt {
  const morpho = Morpho.bind(morphoAddress);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  return balanceOnPool.times(lastPoolIndexes.value2).plus(balanceInP2P.times(p2pBorrowIndex)).div(WAD);
}

export function getUnderlyingSupplyBalance(
  morphoAddress: Address,
  marketAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt
): BigInt {
  const morpho = Morpho.bind(morphoAddress);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);

  return balanceOnPool.times(lastPoolIndexes.value1).plus(balanceInP2P.times(p2pSupplyIndex)).div(WAD);
}
