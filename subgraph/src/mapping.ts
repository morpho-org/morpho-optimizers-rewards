import { Borrowed, Repaid, Supplied, Withdrawn } from "../generated/Morpho/Morpho";
import { getOrIniBalance } from "./initializer";
import { Transaction } from "../generated/schema";
import { endEpochBlockNumber } from "./config";
import { getUnderlyingBorrowBalance, getUnderlyingSupplyBalance } from "./balances";
import { accrueBorrowerMorpho, accrueSupplierMorpho, updateBorrowIndex, updateSupplyIndex } from "./indexes";

export function handleBorrowed(event: Borrowed): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._borrower;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.number);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueBorrowerMorpho(userAddress, marketAddress,prevBalance,newBorrowIndex);
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
}

export function handleRepaid(event: Repaid): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.number);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  const unclaimedRewards = accrueBorrowerMorpho(userAddress, marketAddress,prevBalance,newBorrowIndex);
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
}

export function handleSupplied(event: Supplied): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.number);
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueSupplierMorpho(userAddress, marketAddress,prevBalance,newSupplyIndex);
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
}

export function handleWithdrawn(event: Withdrawn): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.number);
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueSupplierMorpho(userAddress, marketAddress,prevBalance,newSupplyIndex);
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
}
