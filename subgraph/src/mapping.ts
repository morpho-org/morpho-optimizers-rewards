import { Borrowed, P2PIndexesUpdated, Repaid, Supplied, Withdrawn } from "../generated/Morpho/Morpho";
import { Transaction } from "../generated/schema";

import { updateBorrowBalance, updateSupplyBalance } from "./balances";
import { endEpochBlockTimestamp } from "./config";
import { getOrInitMarket } from "./initializer";

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

  const balance = updateBorrowBalance(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    event.params._balanceInP2P,
    event.params._balanceOnPool
  );

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Borrow";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}

export function handleRepaid(event: Repaid): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;

  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;

  const balance = updateBorrowBalance(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    event.params._balanceInP2P,
    event.params._balanceOnPool
  );

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Repay";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}

export function handleSupplied(event: Supplied): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;

  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;

  const balance = updateSupplyBalance(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    event.params._balanceInP2P,
    event.params._balanceOnPool
  );

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Supply";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;

  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;

  const balance = updateSupplyBalance(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    event.params._balanceInP2P,
    event.params._balanceOnPool
  );

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Withdraw";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}
