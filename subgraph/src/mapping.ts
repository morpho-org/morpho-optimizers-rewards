import { Borrowed, P2PIndexesUpdated, Repaid, Supplied, Withdrawn } from "../generated/Morpho/Morpho";
import { Transaction } from "../generated/schema";

import { endEpochBlockTimestamp } from "./config";
import { WAD } from "./constants";
import { accrueMorphoTokens, updateBorrowIndex, updateSupplyIndex } from "./indexes";
import { getOrInitBalance, getOrInitMarket } from "./initializer";

export function handleP2PIndexesUpdated(event: P2PIndexesUpdated): void {
  const market = getOrInitMarket(event.params._poolTokenAddress, event.block.timestamp);
  market.lastP2PBorrowIndex = event.params._p2pBorrowIndex;
  market.lastP2PSupplyIndex = event.params._p2pSupplyIndex;
  market.lastPoolBorrowIndex = event.params._poolBorrowIndex;
  market.lastPoolSupplyIndex = event.params._poolSupplyIndex;
  market.save();
}

export function handleBorrowed(event: Borrowed): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._borrower;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.timestamp);
  const market = getOrInitMarket(marketAddress, event.block.timestamp);
  const underlyingBorrowBalance = event.params._balanceInP2P
    .times(market.lastP2PBorrowIndex)
    .plus(event.params._balanceOnPool.times(market.lastPoolBorrowIndex))
    .div(WAD);
  const balance = getOrInitBalance(userAddress, marketAddress, event.block.timestamp);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, prevBalance);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userBorrowIndex = newBorrowIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Borrow";
  tx.underlyingBorrowBalance = underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();

  // APR
  market.lastTotalBorrow = market.lastTotalBorrow.minus(prevBalance).plus(underlyingBorrowBalance);
  market.borrowIndex = newBorrowIndex;
  market.borrowUpdateBlockTimestamp = event.block.timestamp;
  market.save();
}

export function handleRepaid(event: Repaid): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.timestamp);
  const market = getOrInitMarket(marketAddress, event.block.timestamp);
  const underlyingBorrowBalance = event.params._balanceInP2P
    .times(market.lastP2PBorrowIndex)
    .plus(event.params._balanceOnPool.times(market.lastPoolBorrowIndex))
    .div(WAD);
  const balance = getOrInitBalance(userAddress, marketAddress, event.block.timestamp);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  const unclaimedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, prevBalance);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userBorrowIndex = newBorrowIndex;

  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Repay";
  tx.underlyingBorrowBalance = underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();

  // APR
  market.lastTotalBorrow = market.lastTotalBorrow.minus(prevBalance).plus(underlyingBorrowBalance);
  market.borrowIndex = newBorrowIndex;
  market.borrowUpdateBlockTimestamp = event.block.timestamp;
  market.save();
}

export function handleSupplied(event: Supplied): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.timestamp);
  const market = getOrInitMarket(marketAddress, event.block.timestamp);
  const underlyingSupplyBalance = event.params._balanceInP2P
    .times(market.lastP2PSupplyIndex)
    .plus(event.params._balanceOnPool.times(market.lastPoolSupplyIndex))
    .div(WAD);
  const balance = getOrInitBalance(userAddress, marketAddress, event.block.timestamp);
  const prevBalance = balance.underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, prevBalance);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userSupplyIndex = newSupplyIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Supply";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = underlyingSupplyBalance;
  tx.save();

  // APR
  market.lastTotalSupply = market.lastTotalSupply.minus(prevBalance).plus(underlyingSupplyBalance);
  market.supplyIndex = newSupplyIndex;
  market.supplyUpdateBlockTimestamp = event.block.timestamp;
  market.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.timestamp); // we use the previous underlying balance
  const market = getOrInitMarket(marketAddress, event.block.timestamp);
  const underlyingSupplyBalance = event.params._balanceInP2P
    .times(market.lastP2PSupplyIndex)
    .plus(event.params._balanceOnPool.times(market.lastPoolSupplyIndex))
    .div(WAD);
  const balance = getOrInitBalance(userAddress, marketAddress, event.block.timestamp);
  const prevBalance = balance.underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, prevBalance);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userSupplyIndex = newSupplyIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Withdraw";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = underlyingSupplyBalance;
  tx.save();

  // APR
  market.lastTotalSupply = market.lastTotalSupply.minus(prevBalance).plus(underlyingSupplyBalance);
  market.supplyIndex = newSupplyIndex;
  market.supplyUpdateBlockTimestamp = event.block.timestamp;
  market.save();
}
