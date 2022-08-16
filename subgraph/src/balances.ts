import { Address, BigInt } from "@graphprotocol/graph-ts";

import { Balance } from "../generated/schema";

import { WAD } from "./constants";
import { accrueMorphoTokens, updateBorrowIndex, updateSupplyIndex } from "./indexes";
import { getOrInitBalance, getOrInitMarket } from "./initializer";

export const updateSupplyBalanceAndMarket = (
  marketAddress: Address,
  userAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  newBalanceP2P: BigInt,
  newBalanceOnPool: BigInt
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);

  const newSupplyIndex = updateSupplyIndex(marketAddress, blockTimestamp);
  const newUnderlyingSupplyBalance = newBalanceP2P
    .times(market.lastP2PSupplyIndex)
    .plus(newBalanceOnPool.times(market.lastPoolSupplyIndex))
    .div(WAD);

  const previousBalance = balance.underlyingSupplyBalance;
  const accumulatedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, previousBalance);

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();
  balance.underlyingSupplyBalance = newUnderlyingSupplyBalance;
  balance.userSupplyIndex = newSupplyIndex;
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(accumulatedRewards);
  balance.save();

  // APR
  market.lastTotalSupply = market.lastTotalSupply.minus(previousBalance).plus(newUnderlyingSupplyBalance);
  market.supplyIndex = newSupplyIndex;
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
  newBalanceOnPool: BigInt
): Balance => {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  const balance = getOrInitBalance(userAddress, marketAddress, blockTimestamp);

  const newBorrowIndex = updateBorrowIndex(marketAddress, blockTimestamp);
  const newUnderlyingBorrowBalance = newBalanceP2P
    .times(market.lastP2PBorrowIndex)
    .plus(newBalanceOnPool.times(market.lastPoolBorrowIndex))
    .div(WAD);

  const previousBalance = balance.underlyingBorrowBalance;
  const accumulatedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, previousBalance);

  balance.timestamp = blockTimestamp;
  balance.blockNumber = blockNumber.toI32();
  balance.underlyingBorrowBalance = newUnderlyingBorrowBalance;
  balance.userBorrowIndex = newBorrowIndex;
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(accumulatedRewards);
  balance.save();

  // APR
  market.lastTotalBorrow = market.lastTotalBorrow.minus(previousBalance).plus(newUnderlyingBorrowBalance);
  market.borrowIndex = newBorrowIndex;
  market.borrowUpdateBlockTimestamp = blockTimestamp;
  market.save();

  return balance;
};
