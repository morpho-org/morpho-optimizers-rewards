import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { Balance, Market, MechanismUpgradeSnapshot } from "../generated/schema";

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
import { VERSION_2_TIMESTAMP, WAD } from "./constants";

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
    // We skip accounting for a Supplier position update on V1 script
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
    // Upgrade to V2 mechanism
    computeSupplyIndexUpdate(marketAddress, VERSION_2_TIMESTAMP, indexUnits, balance, market, false);

    const marketUpdate = new MechanismUpgradeSnapshot(market.id + "-supply");
    marketUpdate.market = market.id;
    marketUpdate.indexV1 = market.supplyIndex;
    marketUpdate.poolIndex = market.poolSupplyIndex;
    marketUpdate.p2pIndex = market.p2pSupplyIndex;
    marketUpdate.save();
  }
  if (balance.timestamp.lt(VERSION_2_TIMESTAMP) && market.supplyUpdateBlockTimestamp.ge(VERSION_2_TIMESTAMP)) {
    // we need to accrue user rewards until the update and do eveything like if the user has interacted at the moment of the upgrade
    const marketUpdate = MechanismUpgradeSnapshot.load(market.id + "-supply");
    if (marketUpdate === null) {
      log.critical("No supply market update for market {} ", [market.id]);
      return balance;
    }
    const v1Accrued = accrueMorphoTokens(
      marketUpdate.indexV1,
      balance.userSupplyIndex,
      balance.underlyingSupplyBalance
    );
    balance.accumulatedSupplyMorphoV1 = balance.accumulatedSupplyMorphoV1.plus(v1Accrued);
    balance.accumulatedSupplyMorphoV2 = balance.accumulatedSupplyMorphoV2.plus(
      accrueMorphoTokens(marketUpdate.poolIndex, balance.userSupplyOnPoolIndex, balance.scaledSupplyOnPool).plus(
        accrueMorphoTokens(marketUpdate.p2pIndex, balance.userSupplyInP2PIndex, balance.scaledSupplyInP2P)
      )
    );
    balance.accumulatedSupplyMorpho = balance.accumulatedSupplyMorpho.plus(v1Accrued);
    balance.userSupplyIndex = marketUpdate.indexV1;
    balance.userSupplyInP2PIndex = marketUpdate.p2pIndex;
    balance.userSupplyOnPoolIndex = marketUpdate.poolIndex;
    // the update of user balances is not needed since user has the same balance before and after
    balance.save();
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
  if (!skipV1Accounting && blockTimestamp.le(VERSION_2_TIMESTAMP)) {
    // We skip accounting for a Borrower position update on V1 script

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
    // Upgrade to V2 mechanism

    computeBorrowIndexUpdate(marketAddress, VERSION_2_TIMESTAMP, indexUnits, balance, market, false);

    const marketUpdate = new MechanismUpgradeSnapshot(market.id + "-borrow");
    marketUpdate.market = market.id;
    marketUpdate.indexV1 = market.borrowIndex;
    marketUpdate.poolIndex = market.poolBorrowIndex;
    marketUpdate.p2pIndex = market.p2pBorrowIndex;
    marketUpdate.save();
  }
  if (balance.timestamp.lt(VERSION_2_TIMESTAMP) && market.borrowUpdateBlockTimestamp.ge(VERSION_2_TIMESTAMP)) {
    // we need to accrue user rewards until the update and do eveything like if the user has interacted at the moment of the upgrade
    const marketUpdate = MechanismUpgradeSnapshot.load(market.id + "-borrow");
    if (marketUpdate === null) {
      log.critical("No borrow market update for market {} ", [market.id]);
      return balance;
    }
    const v1Accrued = accrueMorphoTokens(
      marketUpdate.indexV1,
      balance.userBorrowIndex,
      balance.underlyingBorrowBalance
    );
    balance.accumulatedBorrowMorphoV1 = balance.accumulatedBorrowMorphoV1.plus(v1Accrued);
    balance.accumulatedBorrowMorphoV2 = balance.accumulatedBorrowMorphoV2.plus(
      accrueMorphoTokens(marketUpdate.poolIndex, balance.userBorrowOnPoolIndex, balance.scaledBorrowOnPool).plus(
        accrueMorphoTokens(marketUpdate.p2pIndex, balance.userBorrowInP2PIndex, balance.scaledBorrowInP2P)
      )
    );
    balance.accumulatedBorrowMorpho = balance.accumulatedBorrowMorpho.plus(v1Accrued);
    balance.userBorrowIndex = marketUpdate.indexV1;
    balance.userBorrowInP2PIndex = marketUpdate.p2pIndex;
    balance.userBorrowOnPoolIndex = marketUpdate.poolIndex;
    balance.save();
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

  // Needed to handle the mechanism version change
  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();

  balance.save();

  return balance;
};
