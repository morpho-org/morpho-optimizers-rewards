import { Address, BigInt } from "@graphprotocol/graph-ts";

import { Balance } from "../generated/schema";

import {
  accrueMorphoTokens,
  updateBorrowIndex,
  updateBorrowIndexInP2P,
  updateBorrowIndexOnPool,
  updateSupplyIndex,
  updateSupplyIndexInP2P,
  updateSupplyIndexOnPool,
} from "./indexes";
import { getOrInitBalance, getOrInitMarket } from "./initializer";
import { WAD } from "./constants";

export const updateSupplyBalanceAndMarket = (
  marketAddress: Address,
  userAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  newBalanceP2P: BigInt,
  newBalanceOnPool: BigInt,
  indexUnits: u8
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);

  const newSupplyIndex = updateSupplyIndex(marketAddress, blockTimestamp);

  const newSupplyIndexOnPool = updateSupplyIndexOnPool(marketAddress, blockTimestamp, indexUnits);
  const newSupplyIndexInP2P = updateSupplyIndexInP2P(marketAddress, blockTimestamp, indexUnits);

  const newUnderlyingSupplyBalance = newBalanceP2P
    .times(market.lastP2PSupplyIndex)
    .plus(newBalanceOnPool.times(market.lastPoolSupplyIndex))
    .div(WAD);

  const previousBalance = balance.underlyingSupplyBalance;
  const prevInP2P = balance.scaledBorrowInP2P;
  const prevOnPool = balance.scaledBorrowOnPool;
  const accumulatedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, previousBalance);

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();
  balance.underlyingSupplyBalance = newUnderlyingSupplyBalance;
  balance.userSupplyIndex = newSupplyIndex;
  balance.accumulatedMorpho = balance.accumulatedMorpho.plus(accumulatedRewards);

  balance.accumulatedBorrowMorpho = balance.accumulatedBorrowMorpho.plus(
    accrueMorphoTokens(newSupplyIndexOnPool, balance.userBorrowOnPoolIndex, balance.scaledBorrowOnPool).plus(
      accrueMorphoTokens(newSupplyIndexInP2P, balance.userBorrowInP2PIndex, balance.scaledBorrowInP2P)
    )
  );
  balance.userBorrowOnPoolIndex = newSupplyIndexOnPool;
  balance.userBorrowInP2PIndex = newSupplyIndexInP2P;

  balance.scaledSupplyOnPool = newBalanceOnPool;
  balance.scaledSupplyInP2P = newBalanceP2P;
  balance.save();

  // V1
  market.lastTotalSupply = market.lastTotalSupply.minus(previousBalance).plus(newUnderlyingSupplyBalance);
  market.supplyIndex = newSupplyIndex;

  // V2
  market.poolSupplyIndex = newSupplyIndexOnPool;
  market.p2pSupplyIndex = newSupplyIndexInP2P;
  market.scaledSupplyInP2P = market.scaledSupplyInP2P.plus(newBalanceP2P).minus(prevInP2P);
  market.scaledSupplyOnPool = market.scaledSupplyOnPool.plus(newBalanceOnPool).minus(prevOnPool);

  market.supplyUpdateBlockTimestamp = blockTimestamp;
  market.save();

  return balance;
};

export const updateBorrowBalanceAndMarket = (
  marketAddress: Address,
  userAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  newBalanceP2P: BigInt,
  newBalanceOnPool: BigInt,
  indexUnits: u8
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);

  const newBorrowIndex = updateBorrowIndex(marketAddress, blockTimestamp);

  const newBorrowIndexOnPool = updateBorrowIndexOnPool(marketAddress, blockTimestamp, indexUnits);
  const newBorrowIndexInP2P = updateBorrowIndexInP2P(marketAddress, blockTimestamp, indexUnits);

  const newUnderlyingBorrowBalance = newBalanceP2P
    .times(market.lastP2PBorrowIndex)
    .plus(newBalanceOnPool.times(market.lastPoolBorrowIndex))
    .div(WAD);

  const previousBalance = balance.underlyingBorrowBalance;
  const prevInP2P = balance.scaledBorrowInP2P;
  const prevOnPool = balance.scaledBorrowOnPool;
  const accumulatedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, previousBalance);

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();
  balance.underlyingBorrowBalance = newUnderlyingBorrowBalance;
  balance.userBorrowIndex = newBorrowIndex;

  // V2
  balance.accumulatedMorpho = balance.accumulatedMorpho.plus(accumulatedRewards);
  balance.accumulatedBorrowMorpho = balance.accumulatedBorrowMorpho.plus(
    accrueMorphoTokens(newBorrowIndexOnPool, balance.userBorrowOnPoolIndex, balance.scaledBorrowOnPool).plus(
      accrueMorphoTokens(newBorrowIndexInP2P, balance.userBorrowInP2PIndex, balance.scaledBorrowInP2P)
    )
  );
  balance.userBorrowOnPoolIndex = newBorrowIndexOnPool;
  balance.userBorrowInP2PIndex = newBorrowIndexInP2P;
  balance.scaledBorrowOnPool = newBalanceOnPool;
  balance.scaledBorrowInP2P = newBalanceP2P;
  balance.save();

  // APR V1
  market.lastTotalBorrow = market.lastTotalBorrow.minus(previousBalance).plus(newUnderlyingBorrowBalance);
  market.borrowIndex = newBorrowIndex;

  // V2
  market.poolBorrowIndex = newBorrowIndexOnPool;
  market.p2pBorrowIndex = newBorrowIndexInP2P;
  market.scaledBorrowInP2P = market.scaledBorrowInP2P.plus(newBalanceP2P).minus(prevInP2P);
  market.scaledBorrowOnPool = market.scaledBorrowOnPool.plus(newBalanceOnPool).minus(prevOnPool);

  market.borrowUpdateBlockTimestamp = blockTimestamp;
  market.save();

  return balance;
};
