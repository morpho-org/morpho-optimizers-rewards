import { Transaction } from "../generated/schema";

import { updateBorrowBalanceAndMarket, updateSupplyBalanceAndMarket } from "./balances";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";

export const handleBorrowedInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateBorrowBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Borrow";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};

export const handleRepaidInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateBorrowBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Repay";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};

export const handleSuppliedInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateSupplyBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Supply";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};

export const handleWithdrawnInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateSupplyBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Withdraw";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};

export const handleBorrowerPositionUpdatedInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateBorrowBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "BorrowerPositionUpdated";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};
export const handleSupplierPositionUpdatedInternal = (
  event: ethereum.Event,
  marketAddress: Address,
  userAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt,
  indexUnits: u8
): void => {
  const balance = updateSupplyBalanceAndMarket(
    marketAddress,
    userAddress,
    event.block.number,
    event.block.timestamp,
    balanceInP2P,
    balanceOnPool,
    indexUnits
  );

  const tx = new Transaction(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString());
  tx.hash = event.transaction.hash;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "SupplierPositionUpdated";
  tx.target = event.address;
  tx.logIndex = event.transactionLogIndex;
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.scaledInP2P = balanceInP2P;
  tx.scaledOnPool = balanceOnPool;
  tx.save();
};
