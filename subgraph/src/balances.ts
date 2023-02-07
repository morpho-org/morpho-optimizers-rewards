import { Address, BigInt } from "@graphprotocol/graph-ts";

import { Balance, Market } from "../generated/schema";

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

const VERSION_2_TIMESTAMP = BigInt.fromString("1675263600"); // age3 epoch 2 initial timestamp

/**
 * blockTimestamp & supplyUpdateBlockTimestamp must be in
 * the same version to distribute rewards correctly
 */
const computeSupplyIndexUpdate = (
  marketAddress: Address,
  blockTimestamp: BigInt,
  indexUnits: u8,
  balance: Balance,
  market: Market,
  skipV1Accounting: boolean
): void => {
  const newSupplyIndexOnPool = updateSupplyIndexOnPool(marketAddress, blockTimestamp, indexUnits);
  const newSupplyIndexInP2P = updateSupplyIndexInP2P(marketAddress, blockTimestamp, indexUnits);

  const newSupplyIndex = updateSupplyIndex(marketAddress, blockTimestamp);

  const accumulatedMorphoV1 = accrueMorphoTokens(
    newSupplyIndex,
    balance.userSupplyIndex,
    balance.underlyingSupplyBalance
  );
  if (!skipV1Accounting) {
    balance.userSupplyIndex = newSupplyIndex;
    market.supplyIndex = newSupplyIndex;

    balance.accumulatedSupplyMorphoV1 = balance.accumulatedSupplyMorphoV1.plus(accumulatedMorphoV1);
    market.supplyUpdateBlockTimestampV1 = blockTimestamp;
  }

  const accumulatedMorphoV2 = accrueMorphoTokens(
    newSupplyIndexOnPool,
    balance.userSupplyOnPoolIndex,
    balance.scaledSupplyOnPool
  ).plus(accrueMorphoTokens(newSupplyIndexInP2P, balance.userSupplyInP2PIndex, balance.scaledSupplyInP2P));

  balance.accumulatedSupplyMorphoV2 = balance.accumulatedSupplyMorphoV2.plus(accumulatedMorphoV2);
  if (blockTimestamp.le(VERSION_2_TIMESTAMP)) {
    if (!skipV1Accounting) balance.accumulatedSupplyMorpho = balance.accumulatedSupplyMorpho.plus(accumulatedMorphoV1);
  } else {
    balance.accumulatedSupplyMorpho = balance.accumulatedSupplyMorpho.plus(accumulatedMorphoV2);
  }
  balance.userSupplyOnPoolIndex = newSupplyIndexOnPool;
  balance.userSupplyInP2PIndex = newSupplyIndexInP2P;

  market.poolSupplyIndex = newSupplyIndexOnPool;
  market.p2pSupplyIndex = newSupplyIndexInP2P;

  market.supplyUpdateBlockTimestamp = blockTimestamp;
  market.save();
  balance.save();
};

export const updateSupplyBalanceAndMarket = (
  marketAddress: Address,
  userAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  newBalanceP2P: BigInt,
  newBalanceOnPool: BigInt,
  indexUnits: u8,
  skipV1Accounting: boolean
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);
  if (market.supplyUpdateBlockTimestamp.lt(VERSION_2_TIMESTAMP) && blockTimestamp.ge(VERSION_2_TIMESTAMP)) {
    computeSupplyIndexUpdate(marketAddress, VERSION_2_TIMESTAMP, indexUnits, balance, market, false);
  }
  computeSupplyIndexUpdate(marketAddress, blockTimestamp, indexUnits, balance, market, skipV1Accounting);
  // accounting

  // V1

  if (!skipV1Accounting) {
    const newUnderlyingSupplyBalance = newBalanceP2P
      .times(market.lastP2PSupplyIndex)
      .plus(newBalanceOnPool.times(market.lastPoolSupplyIndex))
      .div(WAD);

    market.lastTotalSupply = market.lastTotalSupply
      .minus(balance.underlyingSupplyBalance)
      .plus(newUnderlyingSupplyBalance);

    balance.underlyingSupplyBalance = newUnderlyingSupplyBalance;
  }
  // V2
  market.scaledSupplyInP2P = market.scaledSupplyInP2P.plus(newBalanceP2P).minus(balance.scaledSupplyInP2P);
  market.scaledSupplyOnPool = market.scaledSupplyOnPool.plus(newBalanceOnPool).minus(balance.scaledSupplyOnPool);

  market.save();

  // V2
  balance.scaledSupplyOnPool = newBalanceOnPool;
  balance.scaledSupplyInP2P = newBalanceP2P;

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();

  balance.save();

  return balance;
};

/**
 * blockTimestamp & borrowUpdateBlockTimestamp must be in
 * the same version to distribute rewards correctly
 */
const computeBorrowIndexUpdate = (
  marketAddress: Address,
  blockTimestamp: BigInt,
  indexUnits: u8,
  balance: Balance,
  market: Market,
  skipV1Accounting: boolean
): void => {
  const newBorrowIndex = updateBorrowIndex(marketAddress, blockTimestamp);

  const newBorrowIndexOnPool = updateBorrowIndexOnPool(marketAddress, blockTimestamp, indexUnits);
  const newBorrowIndexInP2P = updateBorrowIndexInP2P(marketAddress, blockTimestamp, indexUnits);

  const accumulatedMorphoV1 = accrueMorphoTokens(
    newBorrowIndex,
    balance.userBorrowIndex,
    balance.underlyingBorrowBalance
  );
  if (!skipV1Accounting) {
    balance.userBorrowIndex = newBorrowIndex;
    balance.accumulatedBorrowMorphoV1 = balance.accumulatedBorrowMorphoV1.plus(accumulatedMorphoV1);
    market.borrowIndex = newBorrowIndex;
    market.borrowUpdateBlockTimestampV1 = blockTimestamp;
  }

  const accumulatedMorphoV2 = accrueMorphoTokens(
    newBorrowIndexOnPool,
    balance.userBorrowOnPoolIndex,
    balance.scaledBorrowOnPool
  ).plus(accrueMorphoTokens(newBorrowIndexInP2P, balance.userBorrowInP2PIndex, balance.scaledBorrowInP2P));

  balance.accumulatedBorrowMorphoV2 = balance.accumulatedBorrowMorphoV2.plus(accumulatedMorphoV2);
  if (blockTimestamp.le(VERSION_2_TIMESTAMP)) {
    if (!skipV1Accounting) balance.accumulatedBorrowMorpho = balance.accumulatedBorrowMorpho.plus(accumulatedMorphoV1);
  } else {
    balance.accumulatedBorrowMorpho = balance.accumulatedBorrowMorpho.plus(accumulatedMorphoV2);
  }
  balance.userBorrowOnPoolIndex = newBorrowIndexOnPool;
  balance.userBorrowInP2PIndex = newBorrowIndexInP2P;

  market.poolBorrowIndex = newBorrowIndexOnPool;
  market.p2pBorrowIndex = newBorrowIndexInP2P;

  market.borrowUpdateBlockTimestamp = blockTimestamp;
  market.save();
  balance.save();
};
export const updateBorrowBalanceAndMarket = (
  marketAddress: Address,
  userAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  newBalanceP2P: BigInt,
  newBalanceOnPool: BigInt,
  indexUnits: u8,
  skipV1Accounting: boolean
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);
  if (market.borrowUpdateBlockTimestamp.lt(VERSION_2_TIMESTAMP) && blockTimestamp.ge(VERSION_2_TIMESTAMP)) {
    computeBorrowIndexUpdate(marketAddress, VERSION_2_TIMESTAMP, indexUnits, balance, market, false);
  }
  computeBorrowIndexUpdate(marketAddress, blockTimestamp, indexUnits, balance, market, skipV1Accounting);
  // accounting

  // V1
  if (!skipV1Accounting) {
    const newUnderlyingBorrowBalance = newBalanceP2P
      .times(market.lastP2PBorrowIndex)
      .plus(newBalanceOnPool.times(market.lastPoolBorrowIndex))
      .div(WAD);
    market.lastTotalBorrow = market.lastTotalBorrow
      .minus(balance.underlyingBorrowBalance)
      .plus(newUnderlyingBorrowBalance);
    // V1
    balance.underlyingBorrowBalance = newUnderlyingBorrowBalance;
  }
  // V2
  market.scaledBorrowInP2P = market.scaledBorrowInP2P.plus(newBalanceP2P).minus(balance.scaledBorrowInP2P);
  market.scaledBorrowOnPool = market.scaledBorrowOnPool.plus(newBalanceOnPool).minus(balance.scaledBorrowOnPool);

  market.save();

  // V2
  balance.scaledBorrowOnPool = newBalanceOnPool;
  balance.scaledBorrowInP2P = newBalanceP2P;

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();

  balance.save();

  return balance;
};
